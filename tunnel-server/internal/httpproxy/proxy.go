package httpproxy

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"strings"
	"time"

	"github.com/thakurdotdev/tunl/tunnel-server/internal/customdomains"
	"github.com/thakurdotdev/tunl/tunnel-server/internal/limits"
	"github.com/thakurdotdev/tunl/tunnel-server/internal/registry"
)

// defaultMaxBodySize applies when Limits leaves the body caps unset.
const defaultMaxBodySize = 5 * 1024 * 1024 // 5 MB

// Limits bounds what one tunnel or visitor can cost the server. Zero
// values disable that limit (except body size, which falls back to 5 MB).
type Limits struct {
	MaxBodyAnon int64 // request body cap for anonymous tunnels
	MaxBodyUser int64 // request body cap for signed-in users' tunnels

	MaxInflightPerTunnel int           // concurrent proxied HTTP requests per tunnel
	InflightWait         time.Duration // how long a request may queue for a slot
	MaxInflightTotal     int           // concurrent proxied HTTP requests server-wide

	MaxWSPerTunnel int // concurrent WebSockets per tunnel
	MaxWSPerIP     int // concurrent WebSockets per visitor IP

	BandwidthAnon int64 // bytes/sec per anonymous tunnel, both directions combined
	BandwidthUser int64 // bytes/sec per signed-in user's tunnel

	// ResponseHeaderTimeout bounds how long we wait for the local app to
	// start responding, so hung apps don't pin goroutines forever.
	ResponseHeaderTimeout time.Duration

	// TunnelGuard's penalty level slows a tunnel's bandwidth: level n
	// divides it by 2^n while the penalty lasts.
	TunnelGuard *limits.Guard
}

type ctxKey string

const tunnelCtxKey ctxKey = "tunnel"

type Handler struct {
	registry             registry.TunnelRegistry
	baseDomain           string
	dialTimeout          time.Duration
	internalSharedSecret string
	customDomains        *customdomains.Resolver
	log                  *slog.Logger
	proxy                *httputil.ReverseProxy

	limits        Limits
	inflight      *limits.Slots
	inflightTotal *limits.Slots
	wsPerTunnel   *limits.Slots
	wsPerIP       *limits.Slots
	buckets       *limits.BucketStore
}

type Options struct {
	Registry             registry.TunnelRegistry
	BaseDomain           string
	DialTimeout          time.Duration
	InternalSharedSecret string
	CustomDomains        *customdomains.Resolver
	Logger               *slog.Logger
	Limits               Limits
}

func NewHandler(opts Options) http.Handler {
	h := &Handler{
		registry:             opts.Registry,
		baseDomain:           opts.BaseDomain,
		dialTimeout:          opts.DialTimeout,
		internalSharedSecret: opts.InternalSharedSecret,
		customDomains:        opts.CustomDomains,
		log:                  opts.Logger,
		limits:               opts.Limits,
		inflight:             limits.NewSlots(opts.Limits.MaxInflightPerTunnel),
		inflightTotal:        limits.NewSlots(opts.Limits.MaxInflightTotal),
		wsPerTunnel:          limits.NewSlots(opts.Limits.MaxWSPerTunnel),
		wsPerIP:              limits.NewSlots(opts.Limits.MaxWSPerIP),
		buckets:              limits.NewBucketStore(),
	}
	if h.log == nil {
		h.log = slog.Default()
	}
	h.proxy = &httputil.ReverseProxy{
		Director: func(req *http.Request) {
			req.URL.Scheme = "http"
			req.URL.Host = "tunnel"
			req.Header.Del("X-Tunl-Internal-Secret")
		},
		Transport: &http.Transport{
			DialContext:           h.dialTunnel,
			DisableKeepAlives:     true,
			ResponseHeaderTimeout: opts.Limits.ResponseHeaderTimeout,
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			subdomain, _ := h.resolveHost(r.Host)
			var tooBig *http.MaxBytesError
			if errors.As(err, &tooBig) {
				renderPayloadTooLarge(w, r, subdomain, tooBig.Limit)
				return
			}
			h.log.Warn("proxy error", "error", err)
			renderProxyError(w, r, http.StatusServiceUnavailable,
				"Service Unavailable",
				"service unavailable",
				"Failed to establish a connection with the local application server behind this tunnel.",
				"Make sure your local development server (e.g., http://localhost:3000) is running and accessible.",
				subdomain,
				"https://tunl.online/dashboard",
				"Open Dashboard →",
			)
		},
	}
	return h
}

func (h *Handler) dialTunnel(ctx context.Context, _, _ string) (net.Conn, error) {
	tunnel := ctx.Value(tunnelCtxKey).(*registry.Tunnel)
	dialCtx, cancel := context.WithTimeout(ctx, h.dialTimeout)
	defer cancel()
	rwc, err := h.dialThrottled(dialCtx, tunnel)
	if err != nil {
		return nil, err
	}
	return wrapAsConn(rwc), nil
}

// dialThrottled opens a channel to the tunnel's local app and makes its
// bytes draw from the tunnel's shared bandwidth bucket.
func (h *Handler) dialThrottled(ctx context.Context, tunnel *registry.Tunnel) (io.ReadWriteCloser, error) {
	rwc, err := tunnel.Conn.Dial(ctx, tunnel.BindAddr, tunnel.BindPort)
	if err != nil {
		return nil, err
	}
	rate := h.limits.BandwidthAnon
	if tunnel.UserID != "" {
		rate = h.limits.BandwidthUser
	}
	sub, guard := tunnel.Subdomain, h.limits.TunnelGuard
	bucket := h.buckets.Get(sub+"|"+tunnel.UserID, rate, func() float64 {
		if _, level, ok := guard.Penalized(sub); ok {
			return float64(int(1) << min(level, 4))
		}
		return 1
	})
	return limits.Throttle(rwc, bucket), nil
}

func (h *Handler) bodyLimit(tunnel *registry.Tunnel) int64 {
	limit := h.limits.MaxBodyAnon
	if tunnel.UserID != "" {
		limit = h.limits.MaxBodyUser
	}
	if limit <= 0 {
		limit = defaultMaxBodySize
	}
	return limit
}

func renderPayloadTooLarge(w http.ResponseWriter, r *http.Request, subdomain string, limit int64) {
	renderProxyError(w, r, http.StatusRequestEntityTooLarge,
		"Payload Too Large",
		"payload too large",
		fmt.Sprintf("This tunnel accepts request bodies up to %d MB.", limit/(1024*1024)),
		"Send a smaller request, or sign in to tunl for a higher upload limit.",
		subdomain,
		"https://tunl.online/dashboard",
		"Open Dashboard →",
	)
}

func renderTunnelBusy(w http.ResponseWriter, r *http.Request, subdomain, detail string) {
	w.Header().Set("Retry-After", "5")
	renderProxyError(w, r, http.StatusServiceUnavailable,
		"Tunnel Busy",
		"tunnel busy",
		detail,
		"Wait a few seconds and try again.",
		subdomain,
		"https://tunl.online/dashboard",
		"Open Dashboard →",
	)
}

type statusWriter struct {
	http.ResponseWriter
	statusCode int
}

func (s *statusWriter) WriteHeader(code int) {
	s.statusCode = code
	s.ResponseWriter.WriteHeader(code)
}

// Unwrap lets http.ResponseController reach Flush/Hijack on the real writer.
func (s *statusWriter) Unwrap() http.ResponseWriter { return s.ResponseWriter }

func formatTerminalLog(now time.Time, method, path string, statusCode int, duration time.Duration) string {
	var methodColor, statusColor string

	switch method {
	case "GET":
		methodColor = "\033[1;32m" // Green
	case "POST":
		methodColor = "\033[1;34m" // Blue
	case "PUT", "PATCH":
		methodColor = "\033[1;33m" // Yellow
	case "DELETE":
		methodColor = "\033[1;31m" // Red
	default:
		methodColor = "\033[1;35m" // Purple
	}

	if statusCode < 300 {
		statusColor = "\033[1;32m" // Green
	} else if statusCode < 400 {
		statusColor = "\033[1;36m" // Cyan
	} else if statusCode < 500 {
		statusColor = "\033[1;33m" // Yellow
	} else {
		statusColor = "\033[1;31m" // Red
	}

	timeStr := now.Format("15:04:05")
	if len(path) > 30 {
		path = path[:27] + "..."
	}

	statusText := http.StatusText(statusCode)
	if statusText == "" {
		statusText = "Unknown"
	}

	return fmt.Sprintf("  \033[90m%s\033[0m  %s%-6s\033[0m  \033[1;37m%-30s\033[0m  %s%-3d %-15s\033[0m  \033[90m%dms\033[0m",
		timeStr, methodColor, method, path, statusColor, statusCode, statusText, duration.Milliseconds())
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Read internal secret header if provided (e.g. from control-plane replay),
	// then immediately delete it from request headers so it is never leaked downstream.
	internalSecret := r.Header.Get("X-Tunl-Internal-Secret")
	r.Header.Del("X-Tunl-Internal-Secret")

	subdomain, _ := h.resolveHost(r.Host)
	if subdomain == "" {
		renderProxyError(w, r, http.StatusNotFound,
			"Host Not Found",
			"unknown host",
			"The requested domain does not map to a valid tunnel host.",
			"Check the URL in your browser address bar to ensure it is spelled correctly.",
			"",
			"https://tunl.online",
			"Back to tunl →",
		)
		return
	}

	tunnel, ok := h.registry.Lookup(subdomain)
	if !ok {
		renderProxyError(w, r, http.StatusNotFound,
			"Tunnel Not Found",
			"tunnel not found",
			"No active tunnel session was found registered for this subdomain.",
			"Ensure your local tunl client is actively connected over SSH.",
			subdomain,
			"https://tunl.online/dashboard",
			"Open Dashboard →",
		)
		return
	}

	if len(tunnel.AllowedIPs) > 0 {
		clientIP := getClientIP(r)
		if !isIPAllowed(clientIP, tunnel.AllowedIPs) {
			renderProxyError(w, r, http.StatusForbidden,
				"Access Restricted",
				"Access Forbidden: IP address not whitelisted",
				"Your IP address is not authorized to access this whitelisted tunnel.",
				fmt.Sprintf("Tunnel owner? Add <strong>%s</strong> to this tunnel's IP allowlist from the dashboard.", clientIP),
				subdomain,
				"https://tunl.online/access",
				"Open Access control →",
			)
			return
		}
	}

	if tunnel.Password != "" {
		isReplay := false
		if h.internalSharedSecret != "" && internalSecret != "" {
			if subtle.ConstantTimeCompare([]byte(internalSecret), []byte(h.internalSharedSecret)) == 1 {
				isReplay = true
			}
		}
		if !isReplay {
			_, pass, ok := r.BasicAuth()
			var valid bool
			if ok {
				hash := sha256.Sum256([]byte(pass))
				hashHex := hex.EncodeToString(hash[:])
				valid = subtle.ConstantTimeCompare([]byte(hashHex), []byte(tunnel.Password)) == 1
			}
			if !valid {
				w.Header().Set("WWW-Authenticate", `Basic realm="tunl protected tunnel"`)
				renderProxyError(w, r, http.StatusUnauthorized,
					"Authentication Required",
					"unauthorized",
					"This tunnel is password-protected by its owner.",
					"Please enter the tunnel password to continue.",
					subdomain,
					"https://tunl.online",
					"Back to tunl →",
				)
				return
			}
		}
	}

	if h.registry.IsDisconnected(subdomain) {
		renderProxyError(w, r, http.StatusServiceUnavailable,
			"Tunnel Temporarily Offline",
			"tunnel temporarily unavailable",
			"The connection to the local tunnel client was temporarily lost.",
			"The client will automatically attempt to reconnect shortly.",
			subdomain,
			"https://tunl.online/dashboard",
			"Open Dashboard →",
		)
		return
	}

	// Enforce the request body cap for this tunnel's tier.
	limit := h.bodyLimit(tunnel)
	if r.ContentLength > limit {
		renderPayloadTooLarge(w, r, subdomain, limit)
		return
	}
	if r.Body != nil {
		r.Body = http.MaxBytesReader(w, r.Body, limit)
	}

	if IsWebSocketUpgrade(r) {
		releaseTunnel, ok := h.wsPerTunnel.TryAcquire(subdomain)
		if !ok {
			renderTunnelBusy(w, r, subdomain, "This tunnel has too many open WebSocket connections.")
			return
		}
		defer releaseTunnel()
		releaseIP, ok := h.wsPerIP.TryAcquire(limits.IPKey(getClientIP(r)))
		if !ok {
			w.Header().Set("Retry-After", "10")
			http.Error(w, "too many open websocket connections from your IP", http.StatusTooManyRequests)
			return
		}
		defer releaseIP()
		h.registry.UpdateActivity(subdomain)
		HandleWebSocket(w, r, func(ctx context.Context) (io.ReadWriteCloser, error) {
			return h.dialThrottled(ctx, tunnel)
		}, h.dialTimeout)
		return
	}

	releaseTotal, ok := h.inflightTotal.TryAcquire("")
	if !ok {
		renderTunnelBusy(w, r, subdomain, "The tunnel server is handling too many requests right now.")
		return
	}
	defer releaseTotal()
	releaseSlot, ok := h.inflight.Acquire(r.Context(), subdomain, h.limits.InflightWait)
	if !ok {
		renderTunnelBusy(w, r, subdomain, "This tunnel has too many requests in progress.")
		return
	}
	defer releaseSlot()

	h.registry.UpdateActivity(subdomain)

	sw := &statusWriter{ResponseWriter: w, statusCode: 200}
	start := time.Now()

	ctx := context.WithValue(r.Context(), tunnelCtxKey, tunnel)
	h.proxy.ServeHTTP(sw, r.WithContext(ctx))

	if tunnel.Conn != nil {
		logLine := formatTerminalLog(start, r.Method, r.URL.RequestURI(), sw.statusCode, time.Since(start))
		tunnel.Conn.WriteTerminalLog(logLine)
	}
}

func (h *Handler) subdomainFromHost(host string) string {
	subdomain, _ := h.resolveHost(host)
	return subdomain
}

// resolveHost maps a Host header to a live subdomain.
// Returns the subdomain plus the original custom host ("" for base-domain hosts).
// Resolution order: *.baseDomain first, then verified custom domains.
func (h *Handler) resolveHost(host string) (subdomain, customHost string) {
	bare := strings.Split(host, ":")[0]
	suffix := "." + h.baseDomain
	if strings.HasSuffix(bare, suffix) {
		sub := strings.TrimSuffix(bare, suffix)
		if !strings.Contains(sub, ".") {
			return sub, ""
		}
		return "", ""
	}
	if h.customDomains == nil {
		return "", ""
	}
	if sub := h.customDomains.Resolve(bare); sub != "" {
		return sub, customdomains.NormalizeHost(bare)
	}
	return "", ""
}

func isIPAllowed(clientIPStr string, allowedIPs []string) bool {
	clientIP := net.ParseIP(clientIPStr)
	if clientIP == nil {
		return false
	}

	for _, entry := range allowedIPs {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}

		// Exact IP match
		if entry == clientIPStr {
			return true
		}

		// Parse as CIDR block (e.g. 192.168.1.0/24)
		_, cidrNet, err := net.ParseCIDR(entry)
		if err == nil && cidrNet.Contains(clientIP) {
			return true
		}
	}

	return false
}

// SubdomainExtractor returns a function that extracts the subdomain from an
// HTTP Host header, given the base domain. Used by the capture middleware.
// When a custom-domain resolver is provided, verified custom hosts also
// resolve to their mapped subdomain; otherwise only *.baseDomain matches.
func SubdomainExtractor(baseDomain string) func(string) string {
	return SubdomainExtractorWithCustomDomains(baseDomain, nil)
}

// SubdomainExtractorWithCustomDomains is SubdomainExtractor plus an optional
// custom-domain resolver fallback.
func SubdomainExtractorWithCustomDomains(baseDomain string, resolver *customdomains.Resolver) func(string) string {
	suffix := "." + baseDomain
	return func(host string) string {
		bare := strings.Split(host, ":")[0]
		if strings.HasSuffix(bare, suffix) {
			sub := strings.TrimSuffix(bare, suffix)
			if strings.Contains(sub, ".") {
				return ""
			}
			return sub
		}
		if resolver == nil {
			return ""
		}
		return resolver.Resolve(bare)
	}
}
