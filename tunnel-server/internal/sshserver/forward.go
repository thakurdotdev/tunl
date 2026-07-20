package sshserver

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"fmt"
	"strings"
	"time"

	"github.com/yourorg/tunnel-saas/tunnel-server/internal/registry"
	"golang.org/x/crypto/ssh"
)

func generateSubdomain() (string, error) {
	buf := make([]byte, 5)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	enc := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(buf)
	return strings.ToLower(enc[:8]), nil
}

func registerAnonymous(reg registry.TunnelRegistry, sess *sshSession, bindAddr string, bindPort uint32, maxRetries int) (string, error) {
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
			BindAddr:  bindAddr,
			BindPort:  bindPort,
			RemoteIP:  sess.RemoteIP(),
			Conn:      sess,
		}
		if err := reg.Register(t); err == nil {
			return sub, nil
		} else {
			lastErr = err
		}
	}
	return "", lastErr
}

// registerReserved tries to register (or reclaim during grace window) the
// authenticated user's reserved subdomain from the control plane.
func registerReserved(reg registry.TunnelRegistry, sess *sshSession, bindAddr string, bindPort uint32) (string, error) {
	sub := sess.AllowedSubdomain()
	t := &registry.Tunnel{
		Subdomain: sub,
		UserID:    sess.UserID(),
		Reserved:  true,
		BindAddr:  bindAddr,
		BindPort:  bindPort,
		RemoteIP:  sess.RemoteIP(),
		Conn:      sess,
	}
	if err := reg.Register(t); err == nil {
		return sub, nil
	}
	// Entry exists — try to reclaim if it's disconnected (grace window reconnect).
	if err := reg.Reclaim(sub, sess, bindAddr, bindPort); err == nil {
		return sub, nil
	}
	return "", registry.ErrSubdomainTaken
}

func (s *Server) handleForwardRequest(ctx context.Context, req *ssh.Request, sess *sshSession) {
	if !sess.markForwarded() {
		s.log.Warn("duplicate tcpip-forward rejected", "session_id", sess.ID())
		sess.setRegisterError("Only one port forwarding request is allowed per SSH session.")
		req.Reply(false, nil)
		closeGracefully(sess)
		return
	}

	var fwd tcpipForwardRequest
	if err := ssh.Unmarshal(req.Payload, &fwd); err != nil {
		s.log.Warn("malformed tcpip-forward payload", "error", err)
		sess.setRegisterError("Malformed port forwarding request payload.")
		req.Reply(false, nil)
		closeGracefully(sess)
		return
	}

	sess.setBindInfo(fwd.BindAddr, fwd.BindPort)

	var sub string
	var err error
	if sess.AllowedSubdomain() != "" {
		sub, err = registerReserved(s.registry, sess, fwd.BindAddr, fwd.BindPort)
	} else {
		sub, err = registerAnonymous(s.registry, sess, fwd.BindAddr, fwd.BindPort, s.subdomainMax)
	}
	if err != nil {
		s.log.Error("subdomain registration failed", "error", err)
		switch err {
		case registry.ErrUserTunnelLimitReached:
			sess.setRegisterError("An active tunnel is already running for your account. Limit: 1 active tunnel.")
		case registry.ErrAnonymousTunnelLimitReached:
			sess.setRegisterError("Anonymous tunnel limit reached for your IP (Max 1 free tunnel per IP). Please sign up to create more.")
		case registry.ErrSubdomainTaken:
			sess.setRegisterError(fmt.Sprintf("Reserved subdomain '%s' is already in use by an active session.", sess.AllowedSubdomain()))
		default:
			sess.setRegisterError(fmt.Sprintf("Failed to register tunnel subdomain: %v", err))
		}
		req.Reply(false, nil)
		closeGracefully(sess)
		return
	}

	url := fmt.Sprintf("%s://%s.%s", s.tunnelScheme, sub, s.baseDomain)
	sess.setTunnelInfo(sub, url)

	s.log.Info("tunnel registered",
		"subdomain", sub,
		"bind_port", fwd.BindPort,
		"session_id", sess.ID(),
		"reserved", sess.AllowedSubdomain() != "",
	)

	reply := tcpipForwardReply{BoundPort: fwd.BindPort}
	req.Reply(true, ssh.Marshal(&reply))
	sess.markReady()
}

func closeGracefully(sess *sshSession) {
	go func() {
		time.Sleep(1 * time.Second)
		sess.Close()
	}()
}
