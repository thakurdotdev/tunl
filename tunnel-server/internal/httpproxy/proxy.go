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

type ctxKey string

const tunnelCtxKey ctxKey = "tunnel"

type Handler struct {
	registry    registry.TunnelRegistry
	baseDomain  string
	dialTimeout time.Duration
	log         *slog.Logger
	proxy       *httputil.ReverseProxy
}

type Options struct {
	Registry    registry.TunnelRegistry
	BaseDomain  string
	DialTimeout time.Duration
	Logger      *slog.Logger
}

func NewHandler(opts Options) http.Handler {
	h := &Handler{
		registry:    opts.Registry,
		baseDomain:  opts.BaseDomain,
		dialTimeout: opts.DialTimeout,
		log:         opts.Logger,
	}
	h.proxy = &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = "http"
			req.URL.Host = "tunnel"
		},
		Transport: &http.Transport{
			DialContext:       h.dialTunnel,
			DisableKeepAlives: true,
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			h.log.Warn("proxy error", "error", err)
			http.Error(w, "bad gateway", http.StatusBadGateway)
		},
	}
	return h
}

func (h *Handler) dialTunnel(ctx context.Context, _, _ string) (net.Conn, error) {
	tunnel := ctx.Value(tunnelCtxKey).(*registry.Tunnel)
	dialCtx, cancel := context.WithTimeout(ctx, h.dialTimeout)
	defer cancel()
	rwc, err := tunnel.Conn.Dial(dialCtx, tunnel.BindAddr, tunnel.BindPort)
	if err != nil {
		return nil, err
	}
	return wrapAsConn(rwc), nil
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

	ctx := context.WithValue(r.Context(), tunnelCtxKey, tunnel)
	h.proxy.ServeHTTP(w, r.WithContext(ctx))
}

func (h *Handler) subdomainFromHost(host string) string {
	host = strings.Split(host, ":")[0]
	suffix := "." + h.baseDomain
	if !strings.HasSuffix(host, suffix) {
		return ""
	}
	sub := strings.TrimSuffix(host, suffix)
	if strings.Contains(sub, ".") {
		return ""
	}
	return sub
}
