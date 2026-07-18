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
	id        string
	userID    string
	subdomain string
	bindAddr  string // must match exactly what the client sent
	bindPort  uint32
	tunnelURL string
	sshConn   *ssh.ServerConn
	done      chan struct{}

	readyOnce sync.Once
	ready     chan struct{} // closed when tunnelURL is set
}

func newSSHSession(id, userID string, conn *ssh.ServerConn) *sshSession {
	return &sshSession{
		id:      id,
		userID:  userID,
		sshConn: conn,
		done:    make(chan struct{}),
		ready:   make(chan struct{}),
	}
}

func (s *sshSession) ID() string            { return s.id }
func (s *sshSession) UserID() string        { return s.userID }
func (s *sshSession) Done() <-chan struct{} { return s.done }

// tunnelReady returns a channel that's closed once the tunnel URL has been
// assigned by handleForwardRequest. The session channel handler blocks on
// this before writing the URL to the client's terminal.
func (s *sshSession) tunnelReady() <-chan struct{} { return s.ready }

func (s *sshSession) markReady() {
	s.readyOnce.Do(func() { close(s.ready) })
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
// The channel-open message carries (remoteAddr, remotePort) which the
// client matches against its tcpip-forward table to route data to the
// correct local listener.
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
