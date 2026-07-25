package httpproxy

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/thakurdotdev/tunl/tunnel-server/internal/registry"
)

func TestIPWhitelistEnforcementHTMLAndCLI(t *testing.T) {
	reg := registry.New(10*time.Second, nil)
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
	reg := registry.New(10*time.Second, nil)
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
