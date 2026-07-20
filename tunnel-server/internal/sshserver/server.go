package sshserver

import (
	"context"
	"crypto/rand"
	"fmt"
	"io"
	"log/slog"
	"net"
	"sync"
	"time"

	"github.com/yourorg/tunnel-saas/tunnel-server/internal/logging"
	"github.com/yourorg/tunnel-saas/tunnel-server/internal/registry"
	"golang.org/x/crypto/ssh"
)

const (
	// defaultMaxConnsPerIP is used when Options.MaxConnsPerIP is unset/invalid.
	defaultMaxConnsPerIP = 10

	// keepaliveInterval controls how often we ping the client and how often
	// we expect TCP-level keepalive probes to fire.
	keepaliveInterval = 15 * time.Second

	// keepaliveSendTimeout bounds how long a single keepalive SendRequest is
	// allowed to block on a half-dead connection before we give up on it.
	keepaliveSendTimeout = 10 * time.Second

	// acceptErrorBackoff is a small pause before retrying Accept() after a
	// non-fatal error, to avoid a tight CPU-spinning loop under sustained
	// accept failures (e.g. fd exhaustion).
	acceptErrorBackoff = 100 * time.Millisecond

	// sessionReadBufSize is the buffer size used when scanning session
	// channel input for control characters (Ctrl+C / Ctrl+D).
	sessionReadBufSize = 128
)

type connLimiter struct {
	mu     sync.Mutex
	counts map[string]int
	max    int
}

func newConnLimiter(max int) *connLimiter {
	return &connLimiter{counts: make(map[string]int), max: max}
}

func (l *connLimiter) acquire(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.counts[ip] >= l.max {
		return false
	}
	l.counts[ip]++
	return true
}

func (l *connLimiter) release(ip string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.counts[ip]--
	if l.counts[ip] <= 0 {
		delete(l.counts, ip)
	}
}

type Server struct {
	listenAddr   string
	baseDomain   string
	tunnelScheme string
	registry     registry.TunnelRegistry
	keyValidator KeyValidator
	subdomainMax int
	sshConfig    *ssh.ServerConfig
	limiter      *connLimiter
	log          *slog.Logger

	// sessMu/sessions track every live sshSession so that ListenAndServe
	// can force-close them when ctx is cancelled. Without this, existing
	// tunnels stayed open indefinitely after a shutdown signal, since
	// cancelling ctx previously only stopped Accept()ing new connections.
	sessMu   sync.Mutex
	sessions map[string]*sshSession
}

type Options struct {
	ListenAddr       string
	BaseDomain       string
	URLScheme        string
	Registry         registry.TunnelRegistry
	KeyValidator     KeyValidator
	SubdomainRetries int
	HostKey          ssh.Signer
	MaxConnsPerIP    int
	Logger           *slog.Logger
}

func New(opts Options) *Server {
	kv := opts.KeyValidator
	if kv == nil {
		kv = anonymousKeyValidator{}
	}

	cfg := &ssh.ServerConfig{
		NoClientAuth:      false,
		PublicKeyCallback: buildAuthCallback(kv),
	}
	cfg.AddHostKey(opts.HostKey)

	scheme := opts.URLScheme
	if scheme == "" {
		scheme = "https"
	}

	maxPerIP := opts.MaxConnsPerIP
	if maxPerIP <= 0 {
		maxPerIP = defaultMaxConnsPerIP
	}

	log := opts.Logger
	if log == nil {
		// Avoid nil-pointer panics if the caller forgot to supply a logger;
		// *slog.Logger method calls on a nil receiver panic.
		log = slog.Default()
	}

	return &Server{
		listenAddr:   opts.ListenAddr,
		baseDomain:   opts.BaseDomain,
		tunnelScheme: scheme,
		registry:     opts.Registry,
		keyValidator: kv,
		subdomainMax: opts.SubdomainRetries,
		sshConfig:    cfg,
		limiter:      newConnLimiter(maxPerIP),
		log:          log,
		sessions:     make(map[string]*sshSession),
	}
}

func (s *Server) ListenAndServe(ctx context.Context) error {
	ln, err := net.Listen("tcp", s.listenAddr)
	if err != nil {
		return fmt.Errorf("ssh listen: %w", err)
	}
	defer ln.Close()

	go func() {
		<-ctx.Done()
		ln.Close()
		// Stop accepting first, then force-close whatever tunnels are
		// still live so shutdown actually terminates active sessions
		// instead of leaving them running until each client disconnects
		// on its own.
		s.closeAllSessions()
	}()

	s.log.Info("ssh server listening", "addr", s.listenAddr)

	for {
		conn, err := ln.Accept()
		if err != nil {
			select {
			case <-ctx.Done():
				return nil
			default:
				s.log.Error("accept failed", "error", err)
				// Brief backoff to avoid a tight spin loop if Accept
				// starts failing continuously (e.g. fd exhaustion).
				time.Sleep(acceptErrorBackoff)
				continue
			}
		}
		go s.handleConn(ctx, conn)
	}
}

// trackSession registers a session so it can be force-closed on shutdown.
func (s *Server) trackSession(sess *sshSession) {
	s.sessMu.Lock()
	defer s.sessMu.Unlock()
	s.sessions[sess.ID()] = sess
}

// untrackSession removes a session once its connection has ended, whether
// that was a normal client disconnect or a shutdown-triggered close.
func (s *Server) untrackSession(sess *sshSession) {
	s.sessMu.Lock()
	defer s.sessMu.Unlock()
	delete(s.sessions, sess.ID())
}

// closeAllSessions force-closes every currently tracked session. Safe to
// call concurrently with trackSession/untrackSession; sshSession.Close
// itself is idempotent, so double-closing a session that's already
// disconnecting on its own is harmless.
func (s *Server) closeAllSessions() {
	s.sessMu.Lock()
	defer s.sessMu.Unlock()
	for _, sess := range s.sessions {
		sess.Close()
	}
}

func (s *Server) handleConn(ctx context.Context, conn net.Conn) {
	remoteIP := extractIP(conn.RemoteAddr())
	if !s.limiter.acquire(remoteIP) {
		s.log.Warn("per-ip connection limit reached", logging.FieldRemoteIP, remoteIP)
		conn.Close()
		return
	}
	defer s.limiter.release(remoteIP)

	if tcpConn, ok := conn.(*net.TCPConn); ok {
		_ = tcpConn.SetKeepAlive(true)
		_ = tcpConn.SetKeepAlivePeriod(keepaliveInterval)
	}

	sshConn, chans, reqs, err := ssh.NewServerConn(conn, s.sshConfig)
	if err != nil {
		s.log.Warn("ssh handshake failed", "remote", conn.RemoteAddr(), "error", err)
		conn.Close()
		return
	}

	userID, email, allowedSubdomain, plan := extractPermissions(sshConn.Permissions)
	sess := newSSHSession(sessionID(), userID, email, allowedSubdomain, plan, remoteIP, sshConn)

	s.trackSession(sess)

	connLog := s.log.With(
		logging.FieldSessionID, sess.ID(),
		logging.FieldRemoteIP, remoteIP,
	)
	if userID != "" {
		connLog = connLog.With(logging.FieldUserID, userID)
	}
	connLog.Info("ssh connection established", "authenticated", userID != "")

	defer func() {
		sess.Close()
		s.untrackSession(sess)
		if sub := sess.Subdomain(); sub != "" {
			s.registry.MarkDisconnected(sub)
			connLog.Info("tunnel disconnected", logging.FieldSubdomain, sub)
		}
		sshConn.Close()
	}()

	keepaliveCtx, cancelKeepalive := context.WithCancel(ctx)
	defer cancelKeepalive()

	go func() {
		ticker := time.NewTicker(keepaliveInterval)
		defer ticker.Stop()
		for {
			select {
			case <-keepaliveCtx.Done():
				return
			case <-sess.Done():
				return
			case <-ticker.C:
				// Bound how long a keepalive can block on a half-dead
				// socket so a silently-dropped connection doesn't sit
				// undetected past this interval.
				_ = conn.SetWriteDeadline(time.Now().Add(keepaliveSendTimeout))
				_, _, err := sshConn.SendRequest("keepalive@openssh.com", true, nil)
				_ = conn.SetWriteDeadline(time.Time{})
				if err != nil {
					connLog.Debug("ssh keepalive failed, closing session", "error", err)
					sess.Close()
					return
				}
			}
		}
	}()

	go s.handleGlobalRequests(ctx, reqs, sess, connLog)
	s.handleChannels(chans, sess, connLog)
}

func extractPermissions(perms *ssh.Permissions) (userID, email, allowedSubdomain, plan string) {
	if perms == nil || perms.Extensions == nil {
		return "", "", "", ""
	}
	return perms.Extensions["user_id"], perms.Extensions["email"], perms.Extensions["allowed_subdomain"], perms.Extensions["plan"]
}

func extractIP(addr net.Addr) string {
	if tcpAddr, ok := addr.(*net.TCPAddr); ok {
		return tcpAddr.IP.String()
	}
	host, _, err := net.SplitHostPort(addr.String())
	if err != nil {
		return addr.String()
	}
	return host
}

func (s *Server) handleGlobalRequests(ctx context.Context, reqs <-chan *ssh.Request, sess *sshSession, log *slog.Logger) {
	for req := range reqs {
		switch req.Type {
		case "tcpip-forward":
			s.handleForwardRequest(ctx, req, sess)
		case "cancel-tcpip-forward":
			if sub := sess.Subdomain(); sub != "" {
				s.registry.Unregister(sub)
				log.Info("tunnel cancelled", logging.FieldSubdomain, sub)
				sess.setSubdomain("")
			}
			if req.WantReply {
				req.Reply(true, nil)
			}
		default:
			if req.WantReply {
				req.Reply(false, nil)
			}
		}
	}
}

func (s *Server) handleChannels(chans <-chan ssh.NewChannel, sess *sshSession, log *slog.Logger) {
	for newCh := range chans {
		switch newCh.ChannelType() {
		case "session":
			go s.handleSessionChannel(newCh, sess, log)
		default:
			newCh.Reject(ssh.UnknownChannelType, "unsupported channel type")
		}
	}
}

func (s *Server) handleSessionChannel(newCh ssh.NewChannel, sess *sshSession, log *slog.Logger) {
	ch, reqs, err := newCh.Accept()
	if err != nil {
		log.Warn("session channel accept failed", "error", err)
		return
	}
	defer ch.Close()

	go func() {
		for req := range reqs {
			switch req.Type {
			case "signal":
				sess.Close()
				if req.WantReply {
					req.Reply(true, nil)
				}
			case "pty-req", "shell", "exec", "env", "window-change":
				if req.WantReply {
					req.Reply(true, nil)
				}
			default:
				if req.WantReply {
					req.Reply(false, nil)
				}
			}
		}
	}()

	// Watch the client's input for Ctrl+C / Ctrl+D so the tunnel can be
	// closed interactively.
	go func() {
		defer sess.Close()
		buf := make([]byte, sessionReadBufSize)
		for {
			n, err := ch.Read(buf)
			if err != nil {
				return
			}
			for i := 0; i < n; i++ {
				// 0x03 is Ctrl+C (ETX), 0x04 is Ctrl+D (EOT)
				if buf[i] == 0x03 || buf[i] == 0x04 {
					return
				}
			}
		}
	}()

	select {
	case <-sess.tunnelReady():
		renderTerminalBanner(ch, s, sess)
	case <-sess.errorReady():
		renderTerminalError(ch, s, sess.RegisterError())
		sess.Close()
		return
	case <-sess.Done():
		if errMsg := sess.RegisterError(); errMsg != "" {
			renderTerminalError(ch, s, errMsg)
		}
		return
	}

	<-sess.Done()
}

func renderTerminalBanner(ch io.Writer, s *Server, sess *sshSession) {
	url := sess.TunnelURL()
	homeURL := fmt.Sprintf("%s://tunl.%s", s.tunnelScheme, s.baseDomain)

	targetHost := sess.BindAddr()
	if targetHost == "" || targetHost == "0.0.0.0" || targetHost == "127.0.0.1" {
		targetHost = "localhost"
	}
	forwardTarget := fmt.Sprintf("http://%s:%d", targetHost, sess.BindPort())

	accountStr := "\033[90mAnonymous\033[0m"
	if sess.UserID() != "" {
		planStr := sess.Plan()
		if planStr == "" {
			planStr = "standard"
		}
		accountStr = fmt.Sprintf("\033[1;37m%s\033[0m \033[36m(%s plan)\033[0m", sess.Email(), planStr)
	}

	fmt.Fprintf(ch, "\r\n")
	fmt.Fprintf(ch, "  \033[1;36m⚡ TUNL\033[0m  \033[90m•\033[0m  \033[1;32m● Online\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90mAccount\033[0m     %s\r\n", accountStr)
	fmt.Fprintf(ch, "  \033[90mForwarding\033[0m  \033[1;33m%s\033[0m\r\n", forwardTarget)
	fmt.Fprintf(ch, "  \033[90mPublic URL\033[0m  \033[1;4;36m%s\033[0m\r\n", url)

	if sess.UserID() != "" && sess.AllowedSubdomain() == "" {
		fmt.Fprintf(ch, "\r\n  \033[33m💡 Tip:\033[0m Reserve a custom domain at \033[4;34m%s\033[0m\r\n", homeURL)
	} else if sess.UserID() == "" {
		fmt.Fprintf(ch, "\r\n  \033[33m💡 Tip:\033[0m Log in to reserve a domain at \033[4;34m%s\033[0m\r\n", homeURL)
	}

	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90mPress \033[1;37mCtrl+C\033[0;90m or \033[1;37mCtrl+D\033[0;90m to stop the tunnel\033[0m\r\n\r\n")
}

func renderTerminalError(ch io.Writer, s *Server, errMsg string) {
	homeURL := fmt.Sprintf("%s://tunl.%s", s.tunnelScheme, s.baseDomain)
	fmt.Fprintf(ch, "\r\n")
	fmt.Fprintf(ch, "  \033[1;31m✖ Tunnel Error\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n")
	fmt.Fprintf(ch, "  \033[90mReason\033[0m     %s\r\n", errMsg)
	fmt.Fprintf(ch, "  \033[90mDashboard\033[0m  \033[4;34m%s\033[0m\r\n", homeURL)
	fmt.Fprintf(ch, "  \033[90m──────────────────────────────────────────────────────────\033[0m\r\n\r\n")
}

func sessionID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x", b)
}
