// proxy.go: the public-facing HTTP(S) listener. ONLY routes using the
// registry — built on net/http + httputil.ReverseProxy, not raw TCP
// splicing, so we get keep-alive/chunked encoding/header rewriting for
// free. See plan section 1.3 step 6.
package httpproxy

import (
	"context"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"strings"
	"time"

	"github.com/yourorg/tunnel-saas/tunnel-server/internal/registry"
)

type Handler struct {
	registry    registry.TunnelRegistry
	baseDomain  string
	dialTimeout time.Duration
	log         *slog.Logger
}

type Options struct {
	Registry    registry.TunnelRegistry
	BaseDomain  string
	DialTimeout time.Duration // per-request timeout on the SSH-backed dial
	Logger      *slog.Logger
}

func NewHandler(opts Options) http.Handler {
	h := &Handler{
		registry:    opts.Registry,
		baseDomain:  opts.BaseDomain,
		dialTimeout: opts.DialTimeout,
		log:         opts.Logger,
	}
	return h
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	subdomain := h.subdomainFromHost(r.Host)
	if subdomain == "" {
		http.Error(w, "unknown host", http.StatusNotFound)
		return
	}

	tunnel, ok := h.registry.Lookup(subdomain)
	if !ok {
		http.Error(w, "tunnel not found", http.StatusNotFound)
		return
	}

	if h.registry.IsDisconnected(subdomain) {
		http.Error(w, "tunnel temporarily unavailable", http.StatusServiceUnavailable)
		return
	}

	if IsWebSocketUpgrade(r) {
		HandleWebSocket(w, r, tunnel, h.dialTimeout)
		return
	}

	h.registry.UpdateActivity(subdomain)

	proxy := &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = "http"
			req.URL.Host = subdomain // arbitrary; DialContext ignores it and dials the tunnel instead
		},
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				dialCtx, cancel := context.WithTimeout(ctx, h.dialTimeout)
				defer cancel()
				rwc, err := tunnel.Conn.Dial(dialCtx, tunnel.BindAddr, tunnel.BindPort)
				if err != nil {
					return nil, err
				}
				return wrapAsConn(rwc), nil
			},
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			h.log.Warn("proxy error", "subdomain", subdomain, "error", err)
			http.Error(w, "bad gateway", http.StatusBadGateway)
		},
	}

	proxy.ServeHTTP(w, r)
}

// subdomainFromHost extracts "abc123" from "abc123.thakur.dev[:port]".
func (h *Handler) subdomainFromHost(host string) string {
	host = strings.Split(host, ":")[0] // strip port
	suffix := "." + h.baseDomain
	if !strings.HasSuffix(host, suffix) {
		return ""
	}
	return strings.TrimSuffix(host, suffix)
}
