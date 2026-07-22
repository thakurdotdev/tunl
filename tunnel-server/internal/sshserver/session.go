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
	email            string
	allowedSubdomain string
	plan             string
	maxActiveTunnels int
	remoteIP         string
	deviceID         string
	sshConn          *ssh.ServerConn
	done             chan struct{}

	closeOnce sync.Once
	closeErr  error

	readyOnce sync.Once
	ready     chan struct{}

	errOnce  sync.Once
	errReady chan struct{}

	mu        sync.Mutex
	subdomain string
	bindAddr  string
	bindPort  uint32
	tunnelURL string
	forwarded bool
	regErr    string
}

func newSSHSession(id, userID, email, allowedSubdomain, plan, remoteIP, deviceID string, maxActiveTunnels int, conn *ssh.ServerConn) *sshSession {
	return &sshSession{
		id:               id,
		userID:           userID,
		email:            email,
		allowedSubdomain: allowedSubdomain,
		plan:             plan,
		maxActiveTunnels: maxActiveTunnels,
		remoteIP:         remoteIP,
		deviceID:         deviceID,
		sshConn:          conn,
		done:             make(chan struct{}),
		ready:            make(chan struct{}),
		errReady:         make(chan struct{}),
	}
}

func (s *sshSession) ID() string                   { return s.id }
func (s *sshSession) UserID() string               { return s.userID }
func (s *sshSession) Email() string                { return s.email }
func (s *sshSession) Plan() string                 { return s.plan }
func (s *sshSession) MaxActiveTunnels() int        { return s.maxActiveTunnels }
func (s *sshSession) AllowedSubdomain() string     { return s.allowedSubdomain }
func (s *sshSession) RemoteIP() string             { return s.remoteIP }
func (s *sshSession) DeviceID() string             { return s.deviceID }
func (s *sshSession) Done() <-chan struct{}        { return s.done }
func (s *sshSession) tunnelReady() <-chan struct{} { return s.ready }
func (s *sshSession) errorReady() <-chan struct{}  { return s.errReady }

func (s *sshSession) RegisterError() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.regErr
}

func (s *sshSession) setRegisterError(err string) {
	s.mu.Lock()
	s.regErr = err
	s.mu.Unlock()
	s.errOnce.Do(func() { close(s.errReady) })
}

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

func (s *sshSession) BindAddr() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.bindAddr
}

func (s *sshSession) BindPort() uint32 {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.bindPort
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

// Close is safe to call concurrently, any number of times, from any number
// of goroutines — only the first call actually closes anything, and every
// caller (concurrent or later) observes the same result. This matters here
// specifically because up to four different goroutines per connection can
// call Close() around the same time: the Ctrl+C/Ctrl+D scanner, the
// "signal" request handler, the keepalive-failure path, and handleConn's
// own deferred cleanup. The previous select-based "check then close"
// pattern was not safe under that concurrency — two goroutines could both
// observe s.done as open and both call close(s.done), panicking.
func (s *sshSession) Close() error {
	s.closeOnce.Do(func() {
		close(s.done)
		s.closeErr = s.sshConn.Close()
	})
	return s.closeErr
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
