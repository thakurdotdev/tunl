package sshserver

import (
	"context"
	"crypto/rand"
	"fmt"
	"io"
	"log/slog"
	"net"
	"sync"

	"github.com/yourorg/tunnel-saas/tunnel-server/internal/logging"
	"github.com/yourorg/tunnel-saas/tunnel-server/internal/registry"
	"golang.org/x/crypto/ssh"
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
		NoClientAuth:   false,
		PublicKeyCallback: buildAuthCallback(kv),
	}
	cfg.AddHostKey(opts.HostKey)

	scheme := opts.URLScheme
	if scheme == "" {
		scheme = "https"
	}

	maxPerIP := opts.MaxConnsPerIP
	if maxPerIP <= 0 {
		maxPerIP = 10
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
		log:          opts.Logger,
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
				continue
			}
		}
		go s.handleConn(ctx, conn)
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

	sshConn, chans, reqs, err := ssh.NewServerConn(conn, s.sshConfig)
	if err != nil {
		s.log.Warn("ssh handshake failed", "remote", conn.RemoteAddr(), "error", err)
		conn.Close()
		return
	}

	userID, allowedSubdomain := extractPermissions(sshConn.Permissions)
	sess := newSSHSession(sessionID(), userID, allowedSubdomain, sshConn)

	connLog := s.log.With(
		logging.FieldSessionID, sess.ID(),
		logging.FieldRemoteIP, remoteIP,
	)
	if userID != "" {
		connLog = connLog.With(logging.FieldUserID, userID)
	}
	connLog.Info("ssh connection established", "authenticated", userID != "")

	defer func() {
		if sub := sess.Subdomain(); sub != "" {
			s.registry.MarkDisconnected(sub)
			connLog.Info("tunnel disconnected", logging.FieldSubdomain, sub)
		}
		sshConn.Close()
	}()

	go s.handleGlobalRequests(ctx, reqs, sess, connLog)
	s.handleChannels(chans, sess, connLog)
}

func extractPermissions(perms *ssh.Permissions) (userID, allowedSubdomain string) {
	if perms == nil || perms.Extensions == nil {
		return "", ""
	}
	return perms.Extensions["user_id"], perms.Extensions["allowed_subdomain"]
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

	go func() {
		io.Copy(io.Discard, ch)
		sess.Close()
	}()

	<-sess.tunnelReady()
	if url := sess.TunnelURL(); url != "" {
		fmt.Fprintf(ch, "\r\nTunnel active: %s\r\n", url)
		fmt.Fprintf(ch, "Connections on this subdomain are forwarded to your local server.\r\n")
		fmt.Fprintf(ch, "Press Ctrl+C to close the tunnel.\r\n\r\n")
	}

	<-sess.Done()
}

func sessionID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x", b)
}
