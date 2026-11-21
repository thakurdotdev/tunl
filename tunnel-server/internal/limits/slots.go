package limits

import (
	"context"
	"sync"
	"time"
)

// Slots caps how many operations may run at once per key (per tunnel, per
// IP…). Keys are created on first use and dropped when idle, so memory
// tracks only keys with work in flight.
type Slots struct {
	max  int
	mu   sync.Mutex
	keys map[string]*slotKey
}

type slotKey struct {
	ch   chan struct{}
	refs int // holders + waiters
}

// NewSlots returns a limiter allowing max concurrent holders per key.
// max <= 0 disables the limit.
func NewSlots(max int) *Slots {
	return &Slots{max: max, keys: make(map[string]*slotKey)}
}

func (s *Slots) ref(key string) *slotKey {
	s.mu.Lock()
	defer s.mu.Unlock()
	k := s.keys[key]
	if k == nil {
		k = &slotKey{ch: make(chan struct{}, s.max)}
		s.keys[key] = k
	}
	k.refs++
	return k
}

func (s *Slots) unref(key string, k *slotKey) {
	s.mu.Lock()
	defer s.mu.Unlock()
	k.refs--
	if k.refs == 0 {
		delete(s.keys, key)
	}
}

// TryAcquire takes a slot without waiting. On success the caller must call
// the returned release exactly once.
func (s *Slots) TryAcquire(key string) (release func(), ok bool) {
	return s.Acquire(context.Background(), key, 0)
}

// Acquire waits up to wait (or until ctx ends) for a slot.
func (s *Slots) Acquire(ctx context.Context, key string, wait time.Duration) (release func(), ok bool) {
	if s == nil || s.max <= 0 {
		return func() {}, true
	}
	k := s.ref(key)
	select {
	case k.ch <- struct{}{}:
		return s.releaser(key, k), true
	default:
	}
	if wait <= 0 {
		s.unref(key, k)
		return nil, false
	}
	timer := time.NewTimer(wait)
	defer timer.Stop()
	select {
	case k.ch <- struct{}{}:
		return s.releaser(key, k), true
	case <-timer.C:
	case <-ctx.Done():
	}
	s.unref(key, k)
	return nil, false
}

func (s *Slots) releaser(key string, k *slotKey) func() {
	var once sync.Once
	return func() {
		once.Do(func() {
			<-k.ch
			s.unref(key, k)
		})
	}
}

// InUse reports the slots currently held for key.
func (s *Slots) InUse(key string) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	if k := s.keys[key]; k != nil {
		return len(k.ch)
	}
	return 0
}
