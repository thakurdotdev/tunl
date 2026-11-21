package httpproxy

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/thakurdotdev/tunl/tunnel-server/internal/limits"
)

// RateLimitConfig controls the per-subdomain and per-IP rate limits.
type RateLimitConfig struct {
	// SubdomainRate is the sustained requests/sec per subdomain.
	SubdomainRate float64
	// SubdomainBurst is the maximum burst for a single subdomain.
	SubdomainBurst int
	// IPRate is the sustained requests/sec per client IP (across all subdomains).
	IPRate float64
	// IPBurst is the maximum burst for a single IP.
	IPBurst int

	// IPGuard, when set, turns repeated per-IP limit hits into escalating
	// temporary bans. Banned IPs get a 429 before any other work is done.
	IPGuard *limits.Guard
	// TunnelGuard, when set, records per-subdomain limit hits. Its penalty
	// level throttles the tunnel's bandwidth (see Options.TunnelGuard).
	TunnelGuard *limits.Guard
	// OnPenalty is called when a key starts a new penalty (for logging and
	// telling the tunnel owner). kind is "ip" or "tunnel".
	OnPenalty func(kind, key string, level int, d time.Duration)
}

// DefaultRateLimitConfig returns the defaults: 300 req/s per subdomain and
// 100 req/s per visitor IP. The IP burst is sized for a cold dev-server page
// load (Vite can fire several hundred module requests at once).
func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		SubdomainRate:  300,
		SubdomainBurst: 800,
		IPRate:         100,
		IPBurst:        400,
	}
}

// maxRateLimitKeys bounds each bucket map; past it, stale buckets are swept
// immediately instead of waiting for the periodic cleanup.
const maxRateLimitKeys = 200_000

// tokenBucket implements a simple token-bucket rate limiter without external
// dependencies. Each bucket refills at `rate` tokens/sec up to `burst`.
type tokenBucket struct {
	tokens   float64
	burst    float64
	rate     float64
	lastTime time.Time
	mu       sync.Mutex
}

func newTokenBucket(rate float64, burst int) *tokenBucket {
	return &tokenBucket{
		tokens:   float64(burst),
		burst:    float64(burst),
		rate:     rate,
		lastTime: time.Now(),
	}
}

// allow consumes one token if available, returning true. Otherwise returns
// false and the caller should reject the request.
func (b *tokenBucket) allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(b.lastTime).Seconds()
	b.lastTime = now

	b.tokens += elapsed * b.rate
	if b.tokens > b.burst {
		b.tokens = b.burst
	}

	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

type rateLimitStore struct {
	buckets   sync.Map // key → *rateLimitEntry
	size      atomic.Int64
	rate      float64
	burst     int
	lastClean atomic.Int64
}

type rateLimitEntry struct {
	bucket   *tokenBucket
	lastSeen atomic.Int64 // unix seconds
}

func newRateLimitStore(rate float64, burst int) *rateLimitStore {
	s := &rateLimitStore{rate: rate, burst: burst}
	s.lastClean.Store(time.Now().Unix())
	return s
}

func (s *rateLimitStore) allow(key string) bool {
	now := time.Now().Unix()

	v, loaded := s.buckets.Load(key)
	if !loaded {
		entry := &rateLimitEntry{bucket: newTokenBucket(s.rate, s.burst)}
		entry.lastSeen.Store(now)
		var stored bool
		v, stored = s.buckets.LoadOrStore(key, entry)
		if !stored {
			if s.size.Add(1) > maxRateLimitKeys {
				if s.lastClean.CompareAndSwap(s.lastClean.Load(), now) {
					go s.cleanupOlderThan(now, 60)
				}
			}
		}
	}
	entry := v.(*rateLimitEntry)
	entry.lastSeen.Store(now)

	// Periodic cleanup of stale buckets (every 5 minutes).
	if now-s.lastClean.Load() > 300 {
		if s.lastClean.CompareAndSwap(s.lastClean.Load(), now) {
			go s.cleanup(now)
		}
	}

	return entry.bucket.allow()
}

func (s *rateLimitStore) cleanup(now int64) {
	s.cleanupOlderThan(now, 600) // 10 minutes
}

func (s *rateLimitStore) cleanupOlderThan(now, staleAfter int64) {
	s.buckets.Range(func(key, value any) bool {
		entry := value.(*rateLimitEntry)
		if now-entry.lastSeen.Load() > staleAfter {
			if _, deleted := s.buckets.LoadAndDelete(key); deleted {
				s.size.Add(-1)
			}
		}
		return true
	})
}

// RateLimitMiddleware enforces per-subdomain and per-IP token-bucket rate
// limits on incoming HTTP requests. When either limit is exceeded the client
// receives a 429 Too Many Requests response with a Retry-After header.
// With guards configured, IPs that keep hammering past their limit are
// banned for escalating periods.
func RateLimitMiddleware(next http.Handler, cfg RateLimitConfig, subdomainExtractor func(string) string) http.Handler {
	subStore := newRateLimitStore(cfg.SubdomainRate, cfg.SubdomainBurst)
	ipStore := newRateLimitStore(cfg.IPRate, cfg.IPBurst)

	reject := func(w http.ResponseWriter, retryAfter int, limit float64, msg string) {
		w.Header().Set("Retry-After", strconv.Itoa(max(retryAfter, 1)))
		if limit > 0 {
			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%.0f", limit))
		}
		w.Header().Set("X-Tunl-Edge-Error", "rate limited")
		http.Error(w, msg, http.StatusTooManyRequests)
	}
	violation := func(kind string, g *limits.Guard, key string) {
		if level, escalated := g.Violation(key); escalated && cfg.OnPenalty != nil {
			rem, _, _ := g.Penalized(key)
			cfg.OnPenalty(kind, key, level, rem)
		}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		subdomain := subdomainExtractor(r.Host)
		if subdomain == "" {
			next.ServeHTTP(w, r)
			return
		}

		ipKey := limits.IPKey(getClientIP(r))

		if rem, _, banned := cfg.IPGuard.Penalized(ipKey); banned {
			reject(w, int(math.Ceil(rem.Seconds())), 0, "too many requests: temporarily blocked")
			return
		}

		// Check per-IP first (tighter limit).
		if !ipStore.allow(ipKey) {
			violation("ip", cfg.IPGuard, ipKey)
			reject(w, int(math.Ceil(1.0/cfg.IPRate)), cfg.IPRate, "rate limit exceeded")
			return
		}

		// Check per-subdomain.
		if !subStore.allow(subdomain) {
			violation("tunnel", cfg.TunnelGuard, subdomain)
			reject(w, int(math.Ceil(1.0/cfg.SubdomainRate)), cfg.SubdomainRate, "rate limit exceeded")
			return
		}

		next.ServeHTTP(w, r)
	})
}
