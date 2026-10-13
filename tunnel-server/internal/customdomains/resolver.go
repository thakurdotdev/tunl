// Package customdomains resolves verified custom hosts to live subdomains.
//
// Routing is an alias lookup: customHost -> subdomain -> registry.
// Only hosts verified in the control plane ever resolve. Results are
// cached in-memory (positive 60s, negative 10s) so a control-plane blip
// does not break live traffic.
package customdomains

import (
	"strings"
	"sync"
	"time"
)

const (
	positiveTTL = 60 * time.Second
	negativeTTL = 10 * time.Second
	maxHostLen  = 253
)

// LookupFunc resolves a lower-cased host via the control plane.
// It returns subdomain + owner userID, or ok=false when unknown/unverified.
type LookupFunc func(host string) (subdomain, userID string, ok bool)

// Resolver caches control-plane custom-domain lookups in memory.
type Resolver struct {
	mu     sync.RWMutex
	cache  map[string]entry
	lookup LookupFunc
	now    func() time.Time
}

type entry struct {
	subdomain string
	userID    string
	ok        bool
	expiresAt time.Time
}

// New returns a Resolver. lookup may be nil (everything misses).
func New(lookup LookupFunc) *Resolver {
	return &Resolver{cache: make(map[string]entry), lookup: lookup, now: time.Now}
}

// Resolve maps a raw Host header value to a subdomain.
// Returns "" when the host is not a verified custom domain.
func (r *Resolver) Resolve(rawHost string) string {
	host := NormalizeHost(rawHost)
	if host == "" || r == nil || r.lookup == nil {
		return ""
	}
	now := r.now()
	r.mu.RLock()
	e, hit := r.cache[host]
	r.mu.RUnlock()
	if hit && now.Before(e.expiresAt) {
		if !e.ok {
			return ""
		}
		return e.subdomain
	}
	subdomain, userID, ok := r.lookup(host)
	r.mu.Lock()
	if ok {
		r.cache[host] = entry{subdomain: subdomain, userID: userID, ok: true, expiresAt: now.Add(positiveTTL)}
	} else {
		r.cache[host] = entry{ok: false, expiresAt: now.Add(negativeTTL)}
	}
	r.mu.Unlock()
	if !ok {
		return ""
	}
	return subdomain
}

// Invalidate drops one cached host (called on domain delete/verify webhooks).
func (r *Resolver) Invalidate(rawHost string) {
	host := NormalizeHost(rawHost)
	if host == "" || r == nil {
		return
	}
	r.mu.Lock()
	delete(r.cache, host)
	r.mu.Unlock()
}

// NormalizeHost lower-cases a Host header value, strips port and trailing dots.
func NormalizeHost(raw string) string {
	host := strings.TrimSpace(raw)
	if host == "" {
		return ""
	}
	if i := strings.LastIndex(host, ":"); i >= 0 {
		if strings.Count(host, ":") == 1 {
			host = host[:i]
		} else {
			host = strings.Trim(host, "[]")
		}
	}
	host = strings.ToLower(strings.Trim(host, ". \t"))
	if host == "" || len(host) > maxHostLen || strings.Contains(host, "..") {
		return ""
	}
	return host
}
