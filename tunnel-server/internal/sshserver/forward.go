package sshserver

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"fmt"
	"strings"
	"time"

	"github.com/thakurdotdev/tunl/tunnel-server/internal/registry"
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
			Subdomain:        sub,
			UserID:           sess.UserID(),
			DeviceID:         sess.DeviceID(),
			Reserved:         false,
			BindAddr:         bindAddr,
			BindPort:         bindPort,
			RemoteIP:         sess.RemoteIP(),
			AllowedIPs:       sess.AllowedIPs(),
			MaxActiveTunnels: sess.MaxActiveTunnels(),
			Conn:             sess,
		}
		if err := reg.Register(t); err == nil {
			return sub, nil
		} else {
			lastErr = err
		}
	}
	return "", lastErr
}

func (s *Server) handleForwardRequest(_ context.Context, req *ssh.Request, sess *sshSession) {
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

	sess.setBindInfo(fwd.BindAddr, fwd.BindPort)

	sub, err := s.resolveSubdomain(sess, fwd.BindAddr, fwd.BindPort)
	if err != nil {
		s.log.Error("subdomain registration failed", "error", err)
		switch err {
		case registry.ErrAnonymousTunnelExists:
			sess.setRegisterError("You already have an active anonymous tunnel from this device. Disconnect it first or sign up for multiple tunnels.")
		case registry.ErrUserTunnelLimitReached:
			sess.setRegisterError(fmt.Sprintf("Active tunnel limit reached for your account (max %d).", sess.MaxActiveTunnels()))
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

	if s.sessionReporter != nil {
		plan := sess.Plan()
		if err := s.sessionReporter.ReportConnected(
			context.Background(),
			sess.UserID(), sess.DeviceID(), sub, sess.RemoteIP(), plan,
			time.Now(),
		); err != nil {
			s.log.Warn("session report failed, dashboard may not show tunnel", "subdomain", sub, "error", err)
		}
	}

	sess.markReady()
}

func closeGracefully(sess *sshSession) {
	go func() {
		time.Sleep(1 * time.Second)
		sess.Close()
	}()
}

func (s *Server) resolveSubdomain(sess *sshSession, bindAddr string, bindPort uint32) (string, error) {
	if sess.UserID() == "" {
		return registerAnonymous(s.registry, sess, bindAddr, bindPort, s.subdomainMax)
	}

	reservedList := sess.ReservedSubdomains()
	if len(reservedList) == 0 && sess.AllowedSubdomain() != "" {
		reservedList = []string{sess.AllowedSubdomain()}
	}

	// Filter reserved subdomains to find available (unconnected) ones
	var available []string
	for _, sub := range reservedList {
		if !s.registry.IsActive(sub) {
			available = append(available, sub)
		}
	}

	// Case 1: No reserved subdomains available -> fallback to random anonymous/ephemeral
	if len(available) == 0 {
		return registerAnonymous(s.registry, sess, bindAddr, bindPort, s.subdomainMax)
	}

	// Case 2: Exactly 1 available -> auto assign
	if len(available) == 1 {
		return registerSpecificReserved(s.registry, sess, available[0], bindAddr, bindPort)
	}

	// Case 3: Multiple available -> Interactive Terminal Selection Menu
	selected := promptSubdomainSelection(sess, available, s.baseDomain)
	if selected == "" {
		selected = available[0]
	}
	if selected == "__random__" {
		return registerAnonymous(s.registry, sess, bindAddr, bindPort, s.subdomainMax)
	}

	return registerSpecificReserved(s.registry, sess, selected, bindAddr, bindPort)
}

func registerSpecificReserved(reg registry.TunnelRegistry, sess *sshSession, sub string, bindAddr string, bindPort uint32) (string, error) {
	t := &registry.Tunnel{
		Subdomain:        sub,
		UserID:           sess.UserID(),
		Reserved:         true,
		BindAddr:         bindAddr,
		BindPort:         bindPort,
		RemoteIP:         sess.RemoteIP(),
		AllowedIPs:       sess.AllowedIPs(),
		MaxActiveTunnels: sess.MaxActiveTunnels(),
		Conn:             sess,
	}
	if err := reg.Register(t); err == nil {
		return sub, nil
	}
	if err := reg.Reclaim(sub, sess, bindAddr, bindPort); err == nil {
		return sub, nil
	}
	return "", registry.ErrSubdomainTaken
}
