package sshserver

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"fmt"
	"strings"

	"github.com/yourorg/tunnel-saas/tunnel-server/internal/registry"
	"golang.org/x/crypto/ssh"
)

func generateSubdomain() (string, error) {
	buf := make([]byte, 5) // 5 bytes → 8 base32 chars
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	enc := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(buf)
	return strings.ToLower(enc[:8]), nil
}

func registerWithRetry(ctx context.Context, reg registry.TunnelRegistry, sess *sshSession, maxRetries int) (string, error) {
	var lastErr error
	for i := 0; i < maxRetries; i++ {
		sub, err := generateSubdomain()
		if err != nil {
			return "", err
		}
		t := &registry.Tunnel{
			Subdomain: sub,
			UserID:    sess.UserID(),
			Reserved:  false,
			BindAddr:  sess.bindAddr,
			BindPort:  sess.bindPort,
			Conn:      sess,
		}
		if err := reg.Register(t); err == nil {
			sess.subdomain = sub
			return sub, nil
		} else {
			lastErr = err
		}
	}
	return "", lastErr
}

// handleForwardRequest processes a "tcpip-forward" global request: parses
// the bind address/port, registers a random subdomain, and replies with the
// assigned port. The bind port is stored on the session so Dial can echo
// it back in forwarded-tcpip channel opens.
func (s *Server) handleForwardRequest(ctx context.Context, req *ssh.Request, sess *sshSession) {
	var fwd tcpipForwardRequest
	if err := ssh.Unmarshal(req.Payload, &fwd); err != nil {
		s.log.Warn("malformed tcpip-forward payload", "error", err)
		req.Reply(false, nil)
		return
	}

	sess.bindAddr = fwd.BindAddr
	sess.bindPort = fwd.BindPort

	sub, err := registerWithRetry(ctx, s.registry, sess, s.subdomainMax)
	if err != nil {
		s.log.Error("subdomain registration failed", "error", err)
		req.Reply(false, nil)
		return
	}

	s.log.Info("tunnel registered",
		"subdomain", sub,
		"bind_port", fwd.BindPort,
		"session_id", sess.ID(),
	)

	reply := tcpipForwardReply{BoundPort: fwd.BindPort}
	req.Reply(true, ssh.Marshal(&reply))

	// The URL is written to the client's terminal via the session channel,
	// not here — see handleSessionChannel in server.go.
	sess.tunnelURL = fmt.Sprintf("http://%s.%s", sub, s.baseDomain)
	sess.markReady()
}
