package httpproxy

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/thakurdotdev/tunl/tunnel-server/internal/customdomains"
	"github.com/thakurdotdev/tunl/tunnel-server/internal/registry"
)

func TestIPWhitelistEnforcementHTMLAndCLI(t *testing.T) {
	reg := registry.New(10*time.Second, nil, 0)
	_ = reg.Register(&registry.Tunnel{
		Subdomain:  "app",
		UserID:     "user-123",
		AllowedIPs: []string{"192.168.1.100"},
	})

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	handler := NewHandler(Options{
		Registry:   reg,
		BaseDomain: "tunl.dev",
		Logger:     logger,
	})

	// Test case 1: Browser client (Accept: text/html) from unauthorized IP (10.0.0.1)
	reqHTML := httptest.NewRequest("GET", "http://app.tunl.dev/", nil)
	reqHTML.Header.Set("Accept", "text/html,application/xhtml+xml")
	reqHTML.RemoteAddr = "10.0.0.1:12345"
	rrHTML := httptest.NewRecorder()

	handler.ServeHTTP(rrHTML, reqHTML)

	if rrHTML.Code != http.StatusForbidden {
		t.Errorf("expected status %d, got %d", http.StatusForbidden, rrHTML.Code)
	}
	if contentType := rrHTML.Header().Get("Content-Type"); !strings.HasPrefix(contentType, "text/html") {
		t.Errorf("expected Content-Type text/html, got %q", contentType)
	}
	bodyHTML := rrHTML.Body.String()
	if !strings.Contains(bodyHTML, "Access Restricted") || !strings.Contains(bodyHTML, "10.0.0.1") {
		t.Errorf("expected HTML body to contain IP 10.0.0.1 and title, got: %s", bodyHTML)
	}

	// Test case 2: CLI client (curl, no HTML in Accept) from unauthorized IP
	reqCLI := httptest.NewRequest("GET", "http://app.tunl.dev/", nil)
	reqCLI.Header.Set("Accept", "*/*")
	reqCLI.Header.Set("User-Agent", "curl/7.68.0")
	reqCLI.RemoteAddr = "10.0.0.1:12345"
	rrCLI := httptest.NewRecorder()

	handler.ServeHTTP(rrCLI, reqCLI)

	if rrCLI.Code != http.StatusForbidden {
		t.Errorf("expected status %d, got %d", http.StatusForbidden, rrCLI.Code)
	}
	if contentType := rrCLI.Header().Get("Content-Type"); !strings.HasPrefix(contentType, "text/plain") {
		t.Errorf("expected Content-Type text/plain, got %q", contentType)
	}
	if !strings.Contains(rrCLI.Body.String(), "Access Forbidden: IP address not whitelisted") {
		t.Errorf("expected plain text forbidden message, got: %s", rrCLI.Body.String())
	}
}

func TestTunnelNotFoundHTML(t *testing.T) {
	reg := registry.New(10*time.Second, nil, 0)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	handler := NewHandler(Options{
		Registry:   reg,
		BaseDomain: "tunl.dev",
		Logger:     logger,
	})

	req := httptest.NewRequest("GET", "http://unknown.tunl.dev/", nil)
	req.Header.Set("Accept", "text/html")
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "Tunnel Not Found") {
		t.Errorf("expected body to contain 'Tunnel Not Found', got %s", rr.Body.String())
	}
}

func TestCustomDomainRouting(t *testing.T) {
	reg := registry.New(10*time.Second, nil, 0)
	// Password hash that won't match an empty password -> handler returns 401
	// before ever dialing the (nil) tunnel connection. A 401 here proves the
	// custom host resolved past the unknown-host check.
	_ = reg.Register(&registry.Tunnel{Subdomain: "myapp", UserID: "user-1", Password: "deadbeef"})

	resolver := customdomains.New(func(host string) (string, string, bool) {
		if host == "app.example.com" {
			return "myapp", "user-1", true
		}
		return "", "", false
	})
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	handler := NewHandler(Options{
		Registry:      reg,
		BaseDomain:    "tunl.dev",
		CustomDomains: resolver,
		Logger:        logger,
	})

	// Verified custom host with an active tunnel -> resolves past unknown-host.
	// (401 because the registered password hash doesn't match; that proves
	// resolution happened without dialing a live tunnel connection.)
	req := httptest.NewRequest("GET", "http://app.example.com/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for password-protected custom domain, got %d: %s", rr.Code, rr.Body.String())
	}

	// Unknown host -> unknown-host 404.
	reqUnknown := httptest.NewRequest("GET", "http://nope.example.com/", nil)
	rrUnknown := httptest.NewRecorder()
	handler.ServeHTTP(rrUnknown, reqUnknown)
	if rrUnknown.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unknown host, got %d", rrUnknown.Code)
	}
	if !strings.Contains(rrUnknown.Body.String(), "unknown host") {
		t.Fatalf("expected unknown-host page, got %s", rrUnknown.Body.String())
	}

	// Verified host but tunnel offline -> tunnel-not-found 404.
	reg2 := registry.New(10*time.Second, nil, 0)
	handler2 := NewHandler(Options{
		Registry:      reg2,
		BaseDomain:    "tunl.dev",
		CustomDomains: resolver,
		Logger:        logger,
	})
	reqOffline := httptest.NewRequest("GET", "http://app.example.com/", nil)
	rrOffline := httptest.NewRecorder()
	handler2.ServeHTTP(rrOffline, reqOffline)
	if rrOffline.Code != http.StatusNotFound || !strings.Contains(rrOffline.Body.String(), "tunnel not found") {
		t.Fatalf("expected tunnel-not-found 404, got %d: %s", rrOffline.Code, rrOffline.Body.String())
	}

	// Extractor used by capture/rate-limit resolves custom hosts too.
	extractor := SubdomainExtractorWithCustomDomains("tunl.dev", resolver)
	if got := extractor("app.example.com"); got != "myapp" {
		t.Fatalf("expected extractor to return myapp, got %q", got)
	}
}
