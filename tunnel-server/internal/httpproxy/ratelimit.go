package httpproxy

import (
	"fmt"
	"math"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
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
}

// DefaultRateLimitConfig returns sensible defaults: 200 req/s per subdomain,
// 50 req/s per IP.
func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		SubdomainRate:  200,
		SubdomainBurst: 400,
		IPRate:         50,
		IPBurst:        100,
	}
}

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
		v, _ = s.buckets.LoadOrStore(key, entry)
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
	const staleAfter = 600 // 10 minutes
	s.buckets.Range(func(key, value any) bool {
		entry := value.(*rateLimitEntry)
		if now-entry.lastSeen.Load() > staleAfter {
			s.buckets.Delete(key)
		}
		return true
	})
}

// RateLimitMiddleware enforces per-subdomain and per-IP token-bucket rate
// limits on incoming HTTP requests. When either limit is exceeded the client
// receives a 429 Too Many Requests response with a Retry-After header.
func RateLimitMiddleware(next http.Handler, cfg RateLimitConfig, subdomainExtractor func(string) string) http.Handler {
	subStore := newRateLimitStore(cfg.SubdomainRate, cfg.SubdomainBurst)
	ipStore := newRateLimitStore(cfg.IPRate, cfg.IPBurst)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		subdomain := subdomainExtractor(r.Host)
		if subdomain == "" {
			next.ServeHTTP(w, r)
			return
		}

		clientIP := getClientIP(r)

		// Check per-IP first (tighter limit).
		if !ipStore.allow(clientIP) {
			retryAfter := int(math.Ceil(1.0 / cfg.IPRate))
			w.Header().Set("Retry-After", fmt.Sprintf("%d", retryAfter))
			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%.0f", cfg.IPRate))
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		// Check per-subdomain.
		if !subStore.allow(subdomain) {
			retryAfter := int(math.Ceil(1.0 / cfg.SubdomainRate))
			w.Header().Set("Retry-After", fmt.Sprintf("%d", retryAfter))
			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%.0f", cfg.SubdomainRate))
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}
