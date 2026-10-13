package customdomains

import (
	"testing"
	"time"
)

func TestNormalizeHost(t *testing.T) {
	cases := map[string]string{
		"App.Example.COM":     "app.example.com",
		"app.example.com.":    "app.example.com",
		"app.example.com:443": "app.example.com",
		"  APP.example.com  ": "app.example.com",
		"":                    "",
		"a..example.com":      "",
		"not a host!":         "not a host!",
	}
	for in, want := range cases {
		if got := NormalizeHost(in); got != want {
			t.Errorf("NormalizeHost(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestResolveCachesPositiveAndNegative(t *testing.T) {
	calls := 0
	r := New(func(host string) (string, string, bool) {
		calls++
		if host == "app.example.com" {
			return "myapp", "user-1", true
		}
		return "", "", false
	})
	now := time.Now()
	r.now = func() time.Time { return now }

	if got := r.Resolve("App.Example.COM"); got != "myapp" {
		t.Fatalf("expected myapp, got %q", got)
	}
	if got := r.Resolve("app.example.com"); got != "myapp" {
		t.Fatalf("expected cached myapp, got %q", got)
	}
	if calls != 1 {
		t.Fatalf("expected 1 lookup call, got %d", calls)
	}

	if got := r.Resolve("unknown.example.com"); got != "" {
		t.Fatalf("expected miss, got %q", got)
	}
	if got := r.Resolve("unknown.example.com"); got != "" {
		t.Fatalf("expected cached miss, got %q", got)
	}
	if calls != 2 {
		t.Fatalf("expected 2 lookup calls, got %d", calls)
	}

	// Expire negative entry -> re-lookup.
	now = now.Add(negativeTTL + time.Second)
	if got := r.Resolve("unknown.example.com"); got != "" {
		t.Fatalf("expected miss after expiry, got %q", got)
	}
	if calls != 3 {
		t.Fatalf("expected 3 lookup calls after negative expiry, got %d", calls)
	}

	r.Invalidate("app.example.com")
	now = now.Add(time.Second)
	if got := r.Resolve("APP.EXAMPLE.COM"); got != "myapp" {
		t.Fatalf("expected myapp after invalidate, got %q", got)
	}
	if calls != 4 {
		t.Fatalf("expected 4 lookup calls after invalidate, got %d", calls)
	}
}

func TestResolveNilLookup(t *testing.T) {
	r := New(nil)
	if got := r.Resolve("app.example.com"); got != "" {
		t.Fatalf("expected empty for nil lookup, got %q", got)
	}
}
