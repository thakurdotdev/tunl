package limits

import (
	"io"
	"sync"
	"time"
)

// Bucket is a byte token bucket. Callers take bytes after (reads) or before
// (writes) moving them and sleep off any debt, which backpressures the SSH
// channel instead of buffering.
type Bucket struct {
	mu     sync.Mutex
	rate   float64 // bytes per second at factor 1
	burst  float64
	tokens float64
	last   time.Time
	// divisor returns the current slowdown (1 = full speed, 2 = half…).
	divisor func() float64
}

func NewBucket(bytesPerSec int64, divisor func() float64) *Bucket {
	rate := float64(bytesPerSec)
	return &Bucket{rate: rate, burst: rate, tokens: rate, last: time.Now(), divisor: divisor}
}

// take consumes n bytes and returns how long the caller should wait.
func (b *Bucket) take(n int) time.Duration {
	if b == nil || b.rate <= 0 || n <= 0 {
		return 0
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	rate := b.rate
	if b.divisor != nil {
		if d := b.divisor(); d > 1 {
			rate /= d
		}
	}
	now := time.Now()
	b.tokens += now.Sub(b.last).Seconds() * rate
	b.last = now
	if b.tokens > b.burst {
		b.tokens = b.burst
	}
	b.tokens -= float64(n)
	if b.tokens >= 0 {
		return 0
	}
	return time.Duration(-b.tokens / rate * float64(time.Second))
}

// Throttle wraps rwc so every byte in either direction draws from b.
func Throttle(rwc io.ReadWriteCloser, b *Bucket) io.ReadWriteCloser {
	if b == nil || b.rate <= 0 {
		return rwc
	}
	return &throttled{ReadWriteCloser: rwc, b: b, chunk: max(int(b.burst/4), 16*1024)}
}

type throttled struct {
	io.ReadWriteCloser
	b     *Bucket
	chunk int
}

func (t *throttled) Read(p []byte) (int, error) {
	if len(p) > t.chunk {
		p = p[:t.chunk]
	}
	n, err := t.ReadWriteCloser.Read(p)
	if d := t.b.take(n); d > 0 {
		time.Sleep(d)
	}
	return n, err
}

func (t *throttled) Write(p []byte) (int, error) {
	written := 0
	for len(p) > 0 {
		c := min(len(p), t.chunk)
		if d := t.b.take(c); d > 0 {
			time.Sleep(d)
		}
		n, err := t.ReadWriteCloser.Write(p[:c])
		written += n
		if err != nil {
			return written, err
		}
		p = p[c:]
	}
	return written, nil
}

// BucketStore hands out one shared Bucket per key so all of a tunnel's
// requests and sockets split the same allowance.
type BucketStore struct {
	mu      sync.Mutex
	buckets map[string]*storedBucket
	last    time.Time
}

type storedBucket struct {
	b        *Bucket
	lastUsed time.Time
}

func NewBucketStore() *BucketStore {
	return &BucketStore{buckets: make(map[string]*storedBucket), last: time.Now()}
}

// Get returns key's bucket, creating it with bytesPerSec on first use.
func (s *BucketStore) Get(key string, bytesPerSec int64, divisor func() float64) *Bucket {
	if bytesPerSec <= 0 {
		return nil
	}
	now := time.Now()
	s.mu.Lock()
	defer s.mu.Unlock()
	if now.Sub(s.last) > 5*time.Minute {
		s.last = now
		for k, sb := range s.buckets {
			if now.Sub(sb.lastUsed) > 30*time.Minute {
				delete(s.buckets, k)
			}
		}
	}
	sb := s.buckets[key]
	if sb == nil || sb.b.rate != float64(bytesPerSec) {
		sb = &storedBucket{b: NewBucket(bytesPerSec, divisor)}
		s.buckets[key] = sb
	}
	sb.lastUsed = now
	return sb.b
}
