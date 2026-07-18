package httpproxy

import (
	"bufio"
	"context"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/yourorg/tunnel-saas/tunnel-server/internal/registry"
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

	// Write the original HTTP upgrade request to the backend so the
	// upstream server actually sees the WebSocket handshake.
	if err := r.Write(backend); err != nil {
		http.Error(w, "bad gateway", http.StatusBadGateway)
		return
	}

	// Read the backend's HTTP response (101 Switching Protocols) before
	// hijacking, so we can forward it to the client.
	backendBuf := bufio.NewReader(backend)
	resp, err := http.ReadResponse(backendBuf, r)
	if err != nil {
		http.Error(w, "bad gateway", http.StatusBadGateway)
		return
	}

	clientConn, _, err := hijacker.Hijack()
	if err != nil {
		return
	}
	defer clientConn.Close()

	// Forward the backend's response (101) to the client.
	if err := resp.Write(clientConn); err != nil {
		return
	}

	// Any buffered data from the backend response reader needs to be
	// drained through the splice too.
	buffered := backendBuf.Buffered()
	if buffered > 0 {
		peek, _ := backendBuf.Peek(buffered)
		clientConn.Write(peek)
	}

	splice(clientConn, backend)
}

func splice(client net.Conn, backend io.ReadWriteCloser) {
	done := make(chan struct{}, 2)
	go func() {
		io.Copy(backend, client)
		done <- struct{}{}
	}()
	go func() {
		io.Copy(client, backend)
		done <- struct{}{}
	}()
	<-done
}
