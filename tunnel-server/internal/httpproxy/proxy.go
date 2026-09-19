package httpproxy

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"strings"
	"time"

	"github.com/thakurdotdev/tunl/tunnel-server/internal/registry"
)

type ctxKey string

const tunnelCtxKey ctxKey = "tunnel"

type Handler struct {
	registry             registry.TunnelRegistry
	baseDomain           string
	dialTimeout          time.Duration
	internalSharedSecret string
	log                  *slog.Logger
	proxy                *httputil.ReverseProxy
}

type Options struct {
	Registry             registry.TunnelRegistry
	BaseDomain           string
	DialTimeout          time.Duration
	InternalSharedSecret string
	Logger               *slog.Logger
}

func NewHandler(opts Options) http.Handler {
	h := &Handler{
		registry:             opts.Registry,
		baseDomain:           opts.BaseDomain,
		dialTimeout:          opts.DialTimeout,
		internalSharedSecret: opts.InternalSharedSecret,
		log:                  opts.Logger,
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
			subdomain := h.subdomainFromHost(r.Host)
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
	rwc, err := tunnel.Conn.Dial(dialCtx, tunnel.BindAddr, tunnel.BindPort)
	if err != nil {
		return nil, err
	}
	return wrapAsConn(rwc), nil
}

type statusWriter struct {
	http.ResponseWriter
	statusCode int
}

func (s *statusWriter) WriteHeader(code int) {
	s.statusCode = code
	s.ResponseWriter.WriteHeader(code)
}

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
	subdomain := h.subdomainFromHost(r.Host)
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
				"https://tunl.online/profile",
				"Open IP Restrictions →",
			)
			return
		}
	}

	if tunnel.Password != "" {
		isReplay := false
		if h.internalSharedSecret != "" && r.Header.Get("X-Tunl-Internal-Secret") == h.internalSharedSecret {
			isReplay = true
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

	if IsWebSocketUpgrade(r) {
		HandleWebSocket(w, r, tunnel, h.dialTimeout)
		return
	}

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

func getClientIP(r *http.Request) string {
	if cfIP := r.Header.Get("CF-Connecting-IP"); cfIP != "" {
		return strings.TrimSpace(cfIP)
	}
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if ip != "" {
				return ip
			}
		}
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
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
func SubdomainExtractor(baseDomain string) func(string) string {
	suffix := "." + baseDomain
	return func(host string) string {
		host = strings.Split(host, ":")[0]
		if !strings.HasSuffix(host, suffix) {
			return ""
		}
		sub := strings.TrimSuffix(host, suffix)
		if strings.Contains(sub, ".") {
			return ""
		}
		return sub
	}
}
