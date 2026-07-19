package sshserver

import (
	"context"
	"fmt"
	"io"
	"sync"

	"github.com/yourorg/tunnel-saas/tunnel-server/internal/registry"
	"golang.org/x/crypto/ssh"
)

type sshSession struct {
	id               string
	userID           string
	allowedSubdomain string
	sshConn          *ssh.ServerConn
	done             chan struct{}

	readyOnce sync.Once
	ready     chan struct{}

	mu        sync.Mutex
	subdomain string
	bindAddr  string
	bindPort  uint32
	tunnelURL string
	forwarded bool
}

func newSSHSession(id, userID, allowedSubdomain string, conn *ssh.ServerConn) *sshSession {
	return &sshSession{
		id:               id,
		userID:           userID,
		allowedSubdomain: allowedSubdomain,
		sshConn:          conn,
		done:             make(chan struct{}),
		ready:            make(chan struct{}),
	}
}

func (s *sshSession) ID() string              { return s.id }
func (s *sshSession) UserID() string           { return s.userID }
func (s *sshSession) AllowedSubdomain() string { return s.allowedSubdomain }
func (s *sshSession) Done() <-chan struct{}     { return s.done }
func (s *sshSession) tunnelReady() <-chan struct{} { return s.ready }

func (s *sshSession) markReady() {
	s.readyOnce.Do(func() { close(s.ready) })
}

func (s *sshSession) Subdomain() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.subdomain
}

func (s *sshSession) setSubdomain(sub string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.subdomain = sub
}

func (s *sshSession) TunnelURL() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.tunnelURL
}

func (s *sshSession) setTunnelInfo(sub, url string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.subdomain = sub
	s.tunnelURL = url
}

func (s *sshSession) setBindInfo(addr string, port uint32) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.bindAddr = addr
	s.bindPort = port
}

// markForwarded returns true on the first call (one tcpip-forward per session).
func (s *sshSession) markForwarded() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.forwarded {
		return false
	}
	s.forwarded = true
	return true
}

func (s *sshSession) Close() error {
	select {
	case <-s.done:
	default:
		close(s.done)
	}
	return s.sshConn.Close()
}

// Dial opens a "forwarded-tcpip" channel back to the connected SSH client.
func (s *sshSession) Dial(ctx context.Context, remoteAddr string, remotePort uint32) (io.ReadWriteCloser, error) {
	msg := channelOpenForwardMsg{
		ConnectedAddr: remoteAddr,
		ConnectedPort: remotePort,
		OriginAddr:    "127.0.0.1",
		OriginPort:    0,
	}

	type result struct {
		ch  ssh.Channel
		err error
	}
	resCh := make(chan result, 1)
	go func() {
		c, reqs, err := s.sshConn.OpenChannel("forwarded-tcpip", ssh.Marshal(&msg))
		if err == nil {
			go ssh.DiscardRequests(reqs)
		}
		resCh <- result{c, err}
	}()

	select {
	case <-ctx.Done():
		return nil, fmt.Errorf("dial timeout: %w", ctx.Err())
	case r := <-resCh:
		return r.ch, r.err
	}
}

var _ registry.TunnelConnection = (*sshSession)(nil)
