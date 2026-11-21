package httpproxy

import (
	"net/http/httptest"
	"testing"
)

func TestGetClientIPIgnoresSpoofedHeadersFromUntrustedPeers(t *testing.T) {
	r := httptest.NewRequest("GET", "http://app.tunl.dev/", nil)
	r.RemoteAddr = "203.0.113.7:4444"
	r.Header.Set("CF-Connecting-IP", "9.9.9.9")
	r.Header.Set("X-Real-IP", "8.8.8.8")
	r.Header.Set("X-Forwarded-For", "7.7.7.7")
	if got := getClientIP(r); got != "203.0.113.7" {
		t.Fatalf("untrusted peer must not choose its IP, got %s", got)
	}
}

func TestGetClientIPTrustsLoopbackProxy(t *testing.T) {
	r := httptest.NewRequest("GET", "http://app.tunl.dev/", nil)
	r.RemoteAddr = "127.0.0.1:4444"
	r.Header.Set("CF-Connecting-IP", "9.9.9.9") // only X-Real-IP counts
	r.Header.Set("X-Real-IP", "198.51.100.20")
	if got := getClientIP(r); got != "198.51.100.20" {
		t.Fatalf("want X-Real-IP from nginx, got %s", got)
	}
	r.Header.Set("X-Real-IP", "not-an-ip")
	if got := getClientIP(r); got != "127.0.0.1" {
		t.Fatalf("garbage X-Real-IP must fall back to peer, got %s", got)
	}
}
