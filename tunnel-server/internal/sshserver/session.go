package sshserver

import (
	"context"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"github.com/thakurdotdev/tunl/tunnel-server/internal/registry"
	"golang.org/x/crypto/ssh"
)

type sshSession struct {
	id                 string
	userID             string
	email              string
	allowedSubdomain   string
	reservedSubdomains []string
	plan               string
	maxActiveTunnels   int
	allowedIPs         []string
	tunnelPasswords    map[string]string
	remoteIP           string
	deviceID           string
	sshConn            *ssh.ServerConn
	permissions        *ssh.Permissions
	done               chan struct{}

	closeOnce sync.Once
	closeErr  error

	readyOnce sync.Once
	ready     chan struct{}

	errOnce  sync.Once
	errReady chan struct{}

	mu              sync.Mutex
	subdomain       string
	bindAddr        string
	bindPort        uint32
	tunnelURL       string
	forwarded       bool
	regErr          string
	termWriter      io.Writer
	termRW          io.ReadWriter
	termWriterReady chan struct{}
	termWriterOnce  sync.Once
	inputChan       chan []byte
}

func newSSHSession(id, userID, email, allowedSubdomain string, reservedSubdomains []string, plan, remoteIP, deviceID string, maxActiveTunnels int, allowedIPs []string, tunnelPasswords map[string]string, conn *ssh.ServerConn) *sshSession {
	var perms *ssh.Permissions
	if conn != nil {
		perms = conn.Permissions
	}
	return &sshSession{
		id:                 id,
		userID:             userID,
		email:              email,
		allowedSubdomain:   allowedSubdomain,
		reservedSubdomains: reservedSubdomains,
		plan:               plan,
		maxActiveTunnels:   maxActiveTunnels,
		allowedIPs:         allowedIPs,
		tunnelPasswords:    tunnelPasswords,
		remoteIP:           remoteIP,
		deviceID:           deviceID,
		sshConn:            conn,
		permissions:        perms,
		done:               make(chan struct{}),
		ready:              make(chan struct{}),
		errReady:           make(chan struct{}),
		termWriterReady:    make(chan struct{}),
		inputChan:          make(chan []byte, 16),
	}
}

func (s *sshSession) ID() string            { return s.id }
func (s *sshSession) UserID() string        { return s.userID }
func (s *sshSession) Email() string         { return s.email }
func (s *sshSession) Plan() string          { return s.plan }
func (s *sshSession) MaxActiveTunnels() int { return s.maxActiveTunnels }
func (s *sshSession) Fingerprint() string {
	if s.permissions != nil {
		return s.permissions.Extensions["fingerprint"]
	}
	return ""
}
func (s *sshSession) ReservedSubdomains() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.reservedSubdomains
}

func (s *sshSession) setReservedSubdomains(subs []string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.reservedSubdomains = subs
}

func (s *sshSession) AllowedSubdomain() string { return s.allowedSubdomain }
func (s *sshSession) RequestedSubdomain() string {
	if s.permissions != nil {
		return s.permissions.Extensions["requested_subdomain"]
	}
	return ""
}
func (s *sshSession) AllowedIPs() []string               { return s.allowedIPs }
func (s *sshSession) TunnelPasswords() map[string]string { return s.tunnelPasswords }
func (s *sshSession) RemoteIP() string                   { return s.remoteIP }
func (s *sshSession) DeviceID() string                   { return s.deviceID }
func (s *sshSession) Done() <-chan struct{}              { return s.done }
func (s *sshSession) tunnelReady() <-chan struct{}       { return s.ready }
func (s *sshSession) errorReady() <-chan struct{}        { return s.errReady }

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

func (s *sshSession) setTerminalWriter(w io.Writer) {
	s.mu.Lock()
	s.termWriter = w
	if rw, ok := w.(io.ReadWriter); ok {
		s.termRW = rw
	}
	s.mu.Unlock()
	s.termWriterOnce.Do(func() {
		close(s.termWriterReady)
	})
}

func (s *sshSession) waitForTerminalWriter(timeout time.Duration) io.Writer {
	select {
	case <-s.termWriterReady:
		s.mu.Lock()
		defer s.mu.Unlock()
		return s.termWriter
	case <-time.After(timeout):
		s.mu.Lock()
		defer s.mu.Unlock()
		return s.termWriter
	}
}

func (s *sshSession) feedInput(b []byte) {
	s.mu.Lock()
	ch := s.inputChan
	s.mu.Unlock()
	if ch != nil {
		select {
		case ch <- b:
		default:
		}
	}
}

func (s *sshSession) ReadTerminalInput(timeout time.Duration) string {
	select {
	case b := <-s.inputChan:
		return strings.TrimSpace(string(b))
	case <-time.After(timeout):
		return ""
	case <-s.done:
		return ""
	}
}

func (s *sshSession) WriteTerminalLog(line string) {
	s.mu.Lock()
	w := s.termWriter
	s.mu.Unlock()
	if w != nil {
		fmt.Fprintf(w, "%s\r\n", line)
	}
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
