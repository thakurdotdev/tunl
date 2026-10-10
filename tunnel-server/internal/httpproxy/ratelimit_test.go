package httpproxy

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRateLimitMiddleware_SubdomainLimit(t *testing.T) {
	cfg := RateLimitConfig{
		SubdomainRate:  10,
		SubdomainBurst: 3,
		IPRate:         100,
		IPBurst:        100,
	}

	handler := RateLimitMiddleware(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
		cfg,
		SubdomainExtractor("tunl.dev"),
	)

	// First 3 requests (burst) should succeed
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest("GET", "http://test.tunl.dev/", nil)
		req.RemoteAddr = fmt.Sprintf("10.0.0.%d:12345", i+1) // Different IPs
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("request %d: expected 200 OK, got %d", i+1, rr.Code)
		}
	}

	// 4th request on the same subdomain should be rate-limited
	req := httptest.NewRequest("GET", "http://test.tunl.dev/", nil)
	req.RemoteAddr = "10.0.0.99:12345"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 Too Many Requests, got %d", rr.Code)
	}

	if retryAfter := rr.Header().Get("Retry-After"); retryAfter == "" {
		t.Fatal("expected Retry-After header to be set")
	}
}

func TestRateLimitMiddleware_IPLimit(t *testing.T) {
	cfg := RateLimitConfig{
		SubdomainRate:  100,
		SubdomainBurst: 100,
		IPRate:         10,
		IPBurst:        2,
	}

	handler := RateLimitMiddleware(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
		cfg,
		SubdomainExtractor("tunl.dev"),
	)

	// Same IP across different subdomains
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest("GET", fmt.Sprintf("http://sub%d.tunl.dev/", i+1), nil)
		req.RemoteAddr = "192.168.1.50:54321"
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("request %d: expected 200 OK, got %d", i+1, rr.Code)
		}
	}

	// 3rd request from same IP should be blocked
	req := httptest.NewRequest("GET", "http://sub3.tunl.dev/", nil)
	req.RemoteAddr = "192.168.1.50:54321"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 Too Many Requests, got %d", rr.Code)
	}
}

func TestRateLimitMiddleware_IgnoresUnknownHost(t *testing.T) {
	cfg := RateLimitConfig{
		SubdomainRate:  1,
		SubdomainBurst: 1,
		IPRate:         1,
		IPBurst:        1,
	}

	handler := RateLimitMiddleware(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
		cfg,
		SubdomainExtractor("tunl.dev"),
	)

	// Non-matching host should bypass rate limiter
	for i := 0; i < 5; i++ {
		req := httptest.NewRequest("GET", "http://tunl.dev/", nil)
		req.RemoteAddr = "10.0.0.1:1234"
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200 OK for base domain request, got %d", rr.Code)
		}
	}
}

func TestRateLimitStore_Cleanup(t *testing.T) {
	store := newRateLimitStore(10, 10)
	store.allow("key1")

	// Verify key exists
	if _, ok := store.buckets.Load("key1"); !ok {
		t.Fatal("expected key1 to exist")
	}

	// Trigger cleanup with simulated future time
	future := time.Now().Unix() + 1000
	store.cleanup(future)

	if _, ok := store.buckets.Load("key1"); ok {
		t.Fatal("expected key1 to be cleaned up")
	}
}
