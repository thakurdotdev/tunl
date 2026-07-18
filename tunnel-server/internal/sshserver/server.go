package sshserver

import (
	"context"
	"crypto/rand"
	"fmt"
	"log/slog"
	"net"

	"github.com/yourorg/tunnel-saas/tunnel-server/internal/logging"
	"github.com/yourorg/tunnel-saas/tunnel-server/internal/registry"
	"golang.org/x/crypto/ssh"
)

type Server struct {
	listenAddr   string
	baseDomain   string
	registry     registry.TunnelRegistry
	keyValidator KeyValidator
	subdomainMax int
	sshConfig    *ssh.ServerConfig
	log          *slog.Logger
}

type Options struct {
	ListenAddr       string
	BaseDomain       string
	Registry         registry.TunnelRegistry
	KeyValidator     KeyValidator
	SubdomainRetries int
	HostKey          ssh.Signer
	Logger           *slog.Logger
}

func New(opts Options) *Server {
	cfg := &ssh.ServerConfig{
		NoClientAuth: true,
	}
	cfg.AddHostKey(opts.HostKey)

	kv := opts.KeyValidator
	if kv == nil {
		kv = anonymousKeyValidator{}
	}

	return &Server{
		listenAddr:   opts.ListenAddr,
		baseDomain:   opts.BaseDomain,
		registry:     opts.Registry,
		keyValidator: kv,
		subdomainMax: opts.SubdomainRetries,
		sshConfig:    cfg,
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
	sshConn, chans, reqs, err := ssh.NewServerConn(conn, s.sshConfig)
	if err != nil {
		s.log.Warn("ssh handshake failed", "remote", conn.RemoteAddr(), "error", err)
		conn.Close()
		return
	}

	sess := newSSHSession(sessionID(), "", sshConn)
	connLog := s.log.With(
		logging.FieldSessionID, sess.ID(),
		logging.FieldRemoteIP, conn.RemoteAddr().String(),
	)
	connLog.Info("ssh connection established")

	defer func() {
		if sess.subdomain != "" {
			s.registry.MarkDisconnected(sess.subdomain)
			connLog.Info("tunnel disconnected", logging.FieldSubdomain, sess.subdomain)
		}
		sshConn.Close()
	}()

	go s.handleGlobalRequests(ctx, reqs, sess, connLog)
	s.handleChannels(chans, sess, connLog)
}

func (s *Server) handleGlobalRequests(ctx context.Context, reqs <-chan *ssh.Request, sess *sshSession, log *slog.Logger) {
	for req := range reqs {
		switch req.Type {
		case "tcpip-forward":
			s.handleForwardRequest(ctx, req, sess)
		case "cancel-tcpip-forward":
			if sess.subdomain != "" {
				s.registry.Unregister(sess.subdomain)
				log.Info("tunnel cancelled", logging.FieldSubdomain, sess.subdomain)
				sess.subdomain = ""
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

// handleSessionChannel accepts the client's session channel and writes the
// tunnel URL back to the client's terminal once it's available. This is the
// "aha moment" — the user sees their public URL immediately after connecting.
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
			case "pty-req", "shell":
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

	// Block until the tunnel URL is set by handleForwardRequest.
	// Both the tcpip-forward request and the session channel open happen
	// concurrently — the client may open the session channel first.
	<-sess.tunnelReady()
	if sess.tunnelURL != "" {
		fmt.Fprintf(ch, "\r\nTunnel active: %s\r\n", sess.tunnelURL)
		fmt.Fprintf(ch, "Connections on this subdomain are forwarded to your local server.\r\n")
		fmt.Fprintf(ch, "Press Ctrl+C to close the tunnel.\r\n\r\n")
	}

	// Keep the channel open until the SSH connection dies.
	<-sess.Done()
}

func sessionID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x", b)
}
