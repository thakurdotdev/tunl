package httpproxy

import (
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync/atomic"
)

// trustedProxies are the peers allowed to tell us the visitor's IP through
// X-Real-IP. In production that's nginx on loopback, which sets X-Real-IP
// from Cloudflare's CF-Connecting-IP only for connections from Cloudflare's
// ranges. Headers from anyone else are ignored, so a visitor can't pick
// their own IP to dodge rate limits or a tunnel's IP allowlist.
var trustedProxies atomic.Pointer[[]*net.IPNet]

func init() {
	if err := SetTrustedProxies([]string{"127.0.0.0/8", "::1/128"}); err != nil {
		panic(err)
	}
}

// SetTrustedProxies replaces the trusted proxy list (IPs or CIDRs).
func SetTrustedProxies(entries []string) error {
	nets := make([]*net.IPNet, 0, len(entries))
	for _, e := range entries {
		e = strings.TrimSpace(e)
		if e == "" {
			continue
		}
		if !strings.Contains(e, "/") {
			if ip := net.ParseIP(e); ip != nil && ip.To4() != nil {
				e += "/32"
			} else {
				e += "/128"
			}
		}
		_, n, err := net.ParseCIDR(e)
		if err != nil {
			return fmt.Errorf("trusted proxy %q: %w", e, err)
		}
		nets = append(nets, n)
	}
	trustedProxies.Store(&nets)
	return nil
}

func isTrustedProxy(ip net.IP) bool {
	for _, n := range *trustedProxies.Load() {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

// getClientIP returns the visitor's IP: X-Real-IP when the request came
// through a trusted proxy, otherwise the TCP peer address.
func getClientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	peer := net.ParseIP(host)
	if peer == nil || !isTrustedProxy(peer) {
		return host
	}
	if xri := strings.TrimSpace(r.Header.Get("X-Real-IP")); xri != "" && net.ParseIP(xri) != nil {
		return xri
	}
	return host
}
