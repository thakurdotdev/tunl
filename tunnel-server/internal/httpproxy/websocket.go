package httpproxy

import (
	"bufio"
	"context"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/thakurdotdev/tunl/tunnel-server/internal/registry"
)

const (
	wsIdleTimeout  = 15 * time.Minute
	wsBytesPerTick = 50 * 1024 * 1024 // 50 MB/sec bandwidth cap per direction
	wsTickInterval = 1 * time.Second
)

func IsWebSocketUpgrade(r *http.Request) bool {
	return strings.EqualFold(r.Header.Get("Upgrade"), "websocket") &&
		strings.Contains(strings.ToLower(r.Header.Get("Connection")), "upgrade")
}

func HandleWebSocket(w http.ResponseWriter, r *http.Request, tunnel *registry.Tunnel, dialTimeout time.Duration) {
	hijacker, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "websocket not supported", http.StatusInternalServerError)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), dialTimeout)
	defer cancel()

	backend, err := tunnel.Conn.Dial(ctx, tunnel.BindAddr, tunnel.BindPort)
	if err != nil {
		http.Error(w, "bad gateway", http.StatusBadGateway)
		return
	}
	defer backend.Close()

	if err := r.Write(backend); err != nil {
		http.Error(w, "bad gateway", http.StatusBadGateway)
		return
	}

	backendBuf := bufio.NewReader(backend)
	resp, err := http.ReadResponse(backendBuf, r)
	if err != nil {
		http.Error(w, "bad gateway", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	clientConn, _, err := hijacker.Hijack()
	if err != nil {
		return
	}
	defer clientConn.Close()

	if err := resp.Write(clientConn); err != nil {
		return
	}

	buffered := backendBuf.Buffered()
	if buffered > 0 {
		peek, _ := backendBuf.Peek(buffered)
		clientConn.Write(peek)
	}

	splice(clientConn, backend, wsIdleTimeout)
}

// activityWriter wraps an io.Writer and calls onWrite after each successful
// write, used to reset idle deadlines on WebSocket splicing.
type activityWriter struct {
	w       io.Writer
	onWrite func()
}

func (a *activityWriter) Write(p []byte) (int, error) {
	n, err := a.w.Write(p)
	if n > 0 {
		a.onWrite()
	}
	return n, err
}

func splice(client net.Conn, backend io.ReadWriteCloser, idleTimeout time.Duration) {
	resetDeadline := func() {
		client.SetDeadline(time.Now().Add(idleTimeout))
	}
	resetDeadline()

	done := make(chan struct{}, 2)
	go func() {
		io.Copy(&activityWriter{w: &throttledWriter{w: backend}, onWrite: resetDeadline}, client)
		done <- struct{}{}
	}()
	go func() {
		io.Copy(&activityWriter{w: &throttledWriter{w: client}, onWrite: resetDeadline}, backend)
		done <- struct{}{}
	}()
	<-done
	client.Close()
	backend.Close()
}

// throttledWriter limits the write throughput to wsBytesPerTick per
// wsTickInterval. This prevents a single WebSocket connection from
// monopolizing the server's bandwidth and SSH channel capacity.
type throttledWriter struct {
	w       io.Writer
	mu      sync.Mutex
	written int64
	last    time.Time
}

func (t *throttledWriter) Write(p []byte) (int, error) {
	t.mu.Lock()
	now := time.Now()
	if now.Sub(t.last) >= wsTickInterval {
		t.written = 0
		t.last = now
	}

	// If we've exceeded the budget for this tick, sleep until the next one.
	if t.written >= wsBytesPerTick {
		sleepDur := wsTickInterval - now.Sub(t.last)
		t.mu.Unlock()
		if sleepDur > 0 {
			time.Sleep(sleepDur)
		}
		t.mu.Lock()
		t.written = 0
		t.last = time.Now()
	}

	t.written += int64(len(p))
	t.mu.Unlock()

	return t.w.Write(p)
}
