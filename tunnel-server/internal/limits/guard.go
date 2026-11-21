// Package limits holds the abuse-protection primitives tunneld uses on both
// the HTTP edge and the SSH listener: an escalating penalty guard, keyed
// concurrency slots, and per-tunnel bandwidth buckets. Everything is
// in-memory; state resets when tunneld restarts.
package limits

import (
	"net"
	"sync"
	"time"
)

// GuardConfig controls how violations turn into penalties.
//
// A "strike" is one second in which a key broke a limit at least once, so a
// burst of 500 rejected requests in the same second counts once. When a key
// collects Threshold strikes inside Window it is penalized for the next
// duration in Penalties, and each further escalation uses the next (longer)
// entry. A key that stays clean for ResetAfter starts again from level 0.
type GuardConfig struct {
	Window     time.Duration
	Threshold  int
	Penalties  []time.Duration
	ResetAfter time.Duration
	// MaxEntries bounds memory; idle records are swept once the map grows
	// past it (and at least once a minute regardless).
	MaxEntries int
}

// DefaultGuardConfig: 10 bad seconds within 5 minutes → 1m, then 10m, 1h, 24h.
func DefaultGuardConfig() GuardConfig {
	return GuardConfig{
		Window:     5 * time.Minute,
		Threshold:  10,
		Penalties:  []time.Duration{time.Minute, 10 * time.Minute, time.Hour, 24 * time.Hour},
		ResetAfter: 24 * time.Hour,
		MaxEntries: 100_000,
	}
}

type record struct {
	windowStart time.Time
	strikes     int
	lastStrike  int64 // unix second of the last counted strike
	level       int
	until       time.Time
	lastPenalty time.Time
}

// Guard tracks strikes and active penalties per key (an IP, a subdomain…).
type Guard struct {
	cfg       GuardConfig
	now       func() time.Time
	mu        sync.Mutex
	records   map[string]*record
	lastSweep time.Time
}

func NewGuard(cfg GuardConfig) *Guard {
	if cfg.Threshold <= 0 {
		cfg.Threshold = 1
	}
	if len(cfg.Penalties) == 0 {
		cfg.Penalties = DefaultGuardConfig().Penalties
	}
	return &Guard{cfg: cfg, now: time.Now, records: make(map[string]*record)}
}

// Penalized reports whether key is serving a penalty, how long is left, and
// its escalation level (1 = first penalty).
func (g *Guard) Penalized(key string) (remaining time.Duration, level int, ok bool) {
	if g == nil {
		return 0, 0, false
	}
	now := g.now()
	g.mu.Lock()
	defer g.mu.Unlock()
	rec := g.records[key]
	if rec == nil || !now.Before(rec.until) {
		return 0, 0, false
	}
	return rec.until.Sub(now), rec.level, true
}

// Violation records that key broke a limit. It returns the key's level and
// true when this call started a new penalty.
func (g *Guard) Violation(key string) (level int, escalated bool) {
	if g == nil {
		return 0, false
	}
	now := g.now()
	g.mu.Lock()
	defer g.mu.Unlock()
	g.maybeSweepLocked(now)

	rec := g.records[key]
	if rec == nil {
		rec = &record{windowStart: now}
		g.records[key] = rec
	}
	if now.Before(rec.until) {
		return rec.level, false // already serving a penalty
	}
	if rec.level > 0 && now.Sub(rec.lastPenalty) > g.cfg.ResetAfter {
		rec.level = 0
	}
	if now.Sub(rec.windowStart) > g.cfg.Window {
		rec.windowStart = now
		rec.strikes = 0
	}
	sec := now.Unix()
	if sec == rec.lastStrike {
		return rec.level, false
	}
	rec.lastStrike = sec
	rec.strikes++
	if rec.strikes < g.cfg.Threshold {
		return rec.level, false
	}

	idx := min(rec.level, len(g.cfg.Penalties)-1)
	rec.level = idx + 1
	rec.until = now.Add(g.cfg.Penalties[idx])
	rec.lastPenalty = now
	rec.strikes = 0
	rec.windowStart = now
	return rec.level, true
}

// Pardon clears any strikes and penalty for key.
func (g *Guard) Pardon(key string) {
	if g == nil {
		return
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	delete(g.records, key)
}

// Len is the number of tracked keys (for tests and metrics).
func (g *Guard) Len() int {
	g.mu.Lock()
	defer g.mu.Unlock()
	return len(g.records)
}

func (g *Guard) maybeSweepLocked(now time.Time) {
	if len(g.records) < g.cfg.MaxEntries && now.Sub(g.lastSweep) < time.Minute {
		return
	}
	g.lastSweep = now
	for k, rec := range g.records {
		penaltyOver := !now.Before(rec.until)
		windowOver := now.Sub(rec.windowStart) > g.cfg.Window
		levelForgotten := rec.level == 0 || now.Sub(rec.lastPenalty) > g.cfg.ResetAfter
		if penaltyOver && windowOver && levelForgotten {
			delete(g.records, k)
		}
	}
}

// IPKey normalizes an IP for limiting: IPv4 as-is, IPv6 collapsed to its /64
// so one host can't dodge limits by rotating through its own prefix.
func IPKey(ip string) string {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return ip
	}
	if v4 := parsed.To4(); v4 != nil {
		return v4.String()
	}
	return parsed.Mask(net.CIDRMask(64, 128)).String() + "/64"
}
