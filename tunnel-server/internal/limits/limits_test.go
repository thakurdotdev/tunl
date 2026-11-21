package limits

import (
	"bytes"
	"io"
	"testing"
	"time"
)

type clock struct{ t time.Time }

func (c *clock) now() time.Time      { return c.t }
func (c *clock) add(d time.Duration) { c.t = c.t.Add(d) }
func newTestGuard(c *clock) *Guard {
	g := NewGuard(GuardConfig{
		Window:     time.Minute,
		Threshold:  3,
		Penalties:  []time.Duration{time.Minute, 10 * time.Minute},
		ResetAfter: time.Hour,
		MaxEntries: 1000,
	})
	g.now = c.now
	return g
}

func TestGuardEscalates(t *testing.T) {
	c := &clock{t: time.Unix(1_000_000, 0)}
	g := newTestGuard(c)

	// Many violations in the same second count as one strike.
	for range 100 {
		g.Violation("ip")
	}
	if _, _, ok := g.Penalized("ip"); ok {
		t.Fatal("one bad second must not penalize")
	}
	c.add(time.Second)
	g.Violation("ip")
	c.add(time.Second)
	if lvl, esc := g.Violation("ip"); !esc || lvl != 1 {
		t.Fatalf("third strike: got level %d escalated %v", lvl, esc)
	}
	if rem, lvl, ok := g.Penalized("ip"); !ok || lvl != 1 || rem != time.Minute {
		t.Fatalf("penalty: rem %v lvl %d ok %v", rem, lvl, ok)
	}

	// After the penalty, three more strikes escalate to level 2 (10m).
	c.add(time.Minute)
	for range 3 {
		c.add(time.Second)
		g.Violation("ip")
	}
	if rem, lvl, ok := g.Penalized("ip"); !ok || lvl != 2 || rem != 10*time.Minute {
		t.Fatalf("second penalty: rem %v lvl %d ok %v", rem, lvl, ok)
	}

	// Further escalations stay at the longest penalty.
	c.add(10 * time.Minute)
	for range 3 {
		c.add(time.Second)
		g.Violation("ip")
	}
	if rem, lvl, _ := g.Penalized("ip"); lvl != 2 || rem != 10*time.Minute {
		t.Fatalf("capped penalty: rem %v lvl %d", rem, lvl)
	}
}

func TestGuardStrikesExpireAndLevelResets(t *testing.T) {
	c := &clock{t: time.Unix(1_000_000, 0)}
	g := newTestGuard(c)

	g.Violation("a")
	c.add(time.Second)
	g.Violation("a")
	c.add(2 * time.Minute) // window passes, strikes forgotten
	g.Violation("a")
	if _, _, ok := g.Penalized("a"); ok {
		t.Fatal("strikes outside the window must not add up")
	}

	for range 3 {
		c.add(time.Second)
		g.Violation("a")
	}
	if _, lvl, _ := g.Penalized("a"); lvl != 1 {
		t.Fatalf("want level 1, got %d", lvl)
	}
	c.add(2 * time.Hour) // clean for longer than ResetAfter
	for range 3 {
		c.add(time.Second)
		g.Violation("a")
	}
	if _, lvl, _ := g.Penalized("a"); lvl != 1 {
		t.Fatalf("level should reset after a clean period, got %d", lvl)
	}
}

func TestGuardSweepsIdleKeys(t *testing.T) {
	c := &clock{t: time.Unix(1_000_000, 0)}
	g := newTestGuard(c)
	for i := range 50 {
		g.Violation(string(rune('a' + i)))
	}
	c.add(5 * time.Minute)
	g.Violation("fresh")
	if g.Len() != 1 {
		t.Fatalf("expected idle keys swept, have %d", g.Len())
	}
}

func TestIPKey(t *testing.T) {
	if got := IPKey("1.2.3.4"); got != "1.2.3.4" {
		t.Fatal(got)
	}
	a, b := IPKey("2001:db8:1:2:aaaa::1"), IPKey("2001:db8:1:2:bbbb::9")
	if a != b || a != "2001:db8:1:2::/64" {
		t.Fatalf("same /64 must share a key: %q %q", a, b)
	}
	if IPKey("2001:db8:1:3::1") == a {
		t.Fatal("different /64 must not share a key")
	}
}

func TestSlots(t *testing.T) {
	s := NewSlots(2)
	r1, ok1 := s.TryAcquire("t")
	r2, ok2 := s.TryAcquire("t")
	_, ok3 := s.TryAcquire("t")
	if !ok1 || !ok2 || ok3 {
		t.Fatalf("want 2 slots, got %v %v %v", ok1, ok2, ok3)
	}
	if _, ok := s.TryAcquire("other"); !ok {
		t.Fatal("keys must be independent")
	}
	go func() { time.Sleep(20 * time.Millisecond); r1() }()
	r4, ok4 := s.Acquire(t.Context(), "t", time.Second)
	if !ok4 {
		t.Fatal("waiter should get the released slot")
	}
	r1() // double release is a no-op
	r2()
	r4()
	if s.InUse("t") != 0 || len(s.keys) != 1 { // "other" is still held
		t.Fatalf("leaked slots: inuse %d keys %d", s.InUse("t"), len(s.keys))
	}
	if _, ok := s.Acquire(t.Context(), "full", 0); !ok {
		t.Fatal("fresh key should acquire")
	}
}

type nopRWC struct{ bytes.Buffer }

func (*nopRWC) Close() error { return nil }

func TestThrottleLimitsRate(t *testing.T) {
	const rate = 64 * 1024
	b := NewBucket(rate, nil)
	w := Throttle(&nopRWC{}, b)
	start := time.Now()
	if _, err := w.Write(make([]byte, 3*rate)); err != nil { // burst + 2s worth
		t.Fatal(err)
	}
	if el := time.Since(start); el < 1800*time.Millisecond || el > 3*time.Second {
		t.Fatalf("3x rate with 1x burst should take ~2s, took %v", el)
	}
}

func TestThrottleDivisorSlowsDown(t *testing.T) {
	const rate = 64 * 1024
	b := NewBucket(rate, func() float64 { return 4 })
	b.tokens = 0
	r := Throttle(&nopRWC{Buffer: *bytes.NewBuffer(make([]byte, rate/4))}, b)
	start := time.Now()
	if _, err := io.ReadAll(r); err != nil {
		t.Fatal(err)
	}
	if el := time.Since(start); el < 800*time.Millisecond {
		t.Fatalf("quarter speed should take ~1s for rate/4 bytes, took %v", el)
	}
}
