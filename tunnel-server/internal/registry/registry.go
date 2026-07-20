// Package registry tracks the subdomain -> Tunnel mapping. It is
// transport-agnostic: it has no idea SSH exists. See plan section 1.2.
package registry

import (
	"context"
	"fmt"
	"io"
	"sync"
	"time"
)

// TunnelConnection is implemented only by sshserver (as sshSession).
// A future TCP-only or other transport could implement this same interface
// without registry or httpproxy ever changing.
type TunnelConnection interface {
	ID() string
	UserID() string        // empty string for anonymous sessions
	Done() <-chan struct{} // closed when the underlying connection ends
	Dial(ctx context.Context, remoteAddr string, remotePort uint32) (io.ReadWriteCloser, error)
	Close() error
}

type Tunnel struct {
	Subdomain string
	UserID    string // empty for anonymous tunnels
	Reserved  bool   // true if tied to a paid/authenticated reservation
	BindAddr  string // echoed in forwarded-tcpip; must match exactly what the client sent in tcpip-forward
	BindPort  uint32
	RemoteIP  string
	CreatedAt time.Time
	LastSeen  time.Time
	Conn      TunnelConnection
}

type TunnelRegistry interface {
	Register(t *Tunnel) error
	Reclaim(subdomain string, conn TunnelConnection, bindAddr string, bindPort uint32) error
	Lookup(subdomain string) (*Tunnel, bool)
	IsDisconnected(subdomain string) bool
	UpdateActivity(subdomain string)
	Unregister(subdomain string)
	MarkDisconnected(subdomain string)

	ActiveCount() int
	AnonymousCount() int
	ReservedCount() int
}

var (
	ErrSubdomainTaken               = fmt.Errorf("subdomain already registered")
	ErrUserTunnelLimitReached     = fmt.Errorf("active tunnel limit reached for user")
	ErrAnonymousTunnelLimitReached = fmt.Errorf("active anonymous tunnel limit reached for IP")
)

type entry struct {
	tunnel       *Tunnel
	disconnected bool
	graceTimer   *time.Timer
}

// InMemoryRegistry is the only TunnelRegistry implementation for now —
// Redis / multi-instance is explicitly out of scope (plan section 1.4 / 6).
type InMemoryRegistry struct {
	mu                 sync.RWMutex
	entries            map[string]*entry
	reserved           map[string]struct{}
	graceWindow        time.Duration
	maxAnonymousPerIP int
}

func New(graceWindow time.Duration, reserved map[string]struct{}, maxAnonymousPerIP int) *InMemoryRegistry {
	if reserved == nil {
		reserved = make(map[string]struct{})
	}
	if maxAnonymousPerIP <= 0 {
		maxAnonymousPerIP = 1
	}
	return &InMemoryRegistry{
		entries:            make(map[string]*entry),
		reserved:           reserved,
		graceWindow:        graceWindow,
		maxAnonymousPerIP: maxAnonymousPerIP,
	}
}

func (r *InMemoryRegistry) Register(t *Tunnel) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if t.UserID != "" {
		for _, e := range r.entries {
			if !e.disconnected && e.tunnel.UserID == t.UserID {
				return ErrUserTunnelLimitReached
			}
		}
	} else if t.RemoteIP != "" {
		anonCount := 0
		for _, e := range r.entries {
			if !e.disconnected && !e.tunnel.Reserved && e.tunnel.RemoteIP == t.RemoteIP {
				anonCount++
			}
		}
		if anonCount >= r.maxAnonymousPerIP {
			return ErrAnonymousTunnelLimitReached
		}
	}

	if _, blocked := r.reserved[t.Subdomain]; blocked {
		return ErrSubdomainTaken
	}
	if _, exists := r.entries[t.Subdomain]; exists {
		return ErrSubdomainTaken
	}
	if t.CreatedAt.IsZero() {
		t.CreatedAt = time.Now()
	}
	t.LastSeen = time.Now()
	r.entries[t.Subdomain] = &entry{tunnel: t}
	return nil
}

func (r *InMemoryRegistry) Lookup(subdomain string) (*Tunnel, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	e, ok := r.entries[subdomain]
	if !ok {
		return nil, false
	}
	return e.tunnel, true
}

func (r *InMemoryRegistry) IsDisconnected(subdomain string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	e, ok := r.entries[subdomain]
	return ok && e.disconnected
}

// Reclaim replaces the connection on a disconnected entry, cancelling its
// grace timer. Used when an authenticated user reconnects with their
// reserved subdomain before the grace window expires.
func (r *InMemoryRegistry) Reclaim(subdomain string, conn TunnelConnection, bindAddr string, bindPort uint32) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	e, ok := r.entries[subdomain]
	if !ok {
		return fmt.Errorf("subdomain not in registry")
	}
	if !e.disconnected {
		return ErrSubdomainTaken
	}
	if e.graceTimer != nil {
		e.graceTimer.Stop()
		e.graceTimer = nil
	}
	e.disconnected = false
	e.tunnel.Conn = conn
	e.tunnel.BindAddr = bindAddr
	e.tunnel.BindPort = bindPort
	e.tunnel.LastSeen = time.Now()
	return nil
}

func (r *InMemoryRegistry) UpdateActivity(subdomain string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	e, ok := r.entries[subdomain]
	if !ok {
		return
	}
	e.tunnel.LastSeen = time.Now()

	// Cancel any pending grace-window removal — the tunnel is back.
	if e.disconnected && e.graceTimer != nil {
		e.graceTimer.Stop()
		e.graceTimer = nil
		e.disconnected = false
	}
}

func (r *InMemoryRegistry) Unregister(subdomain string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.unregisterLocked(subdomain)
}

func (r *InMemoryRegistry) unregisterLocked(subdomain string) {
	if e, ok := r.entries[subdomain]; ok {
		if e.graceTimer != nil {
			e.graceTimer.Stop()
		}
		delete(r.entries, subdomain)
	}
}

// MarkDisconnected does NOT remove the entry immediately. It starts a grace
// window timer; if UpdateActivity is called for the same subdomain before
// the timer fires (i.e. the same user reconnects), the removal is cancelled.
// This does not make httpproxy serve stale traffic — httpproxy still 503s
// while the tunnel is down; the grace window only protects the subdomain
// reservation and prevents dashboard status flapping.
func (r *InMemoryRegistry) MarkDisconnected(subdomain string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	e, ok := r.entries[subdomain]
	if !ok {
		return
	}
	if e.disconnected {
		return // already in a grace window
	}
	e.disconnected = true
	e.graceTimer = time.AfterFunc(r.graceWindow, func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		// Only remove if still disconnected — a reconnect may have raced us
		// and already cleared the flag via UpdateActivity.
		if cur, ok := r.entries[subdomain]; ok && cur.disconnected {
			r.unregisterLocked(subdomain)
		}
	})
}

func (r *InMemoryRegistry) ActiveCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.entries)
}

func (r *InMemoryRegistry) AnonymousCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	n := 0
	for _, e := range r.entries {
		if !e.tunnel.Reserved {
			n++
		}
	}
	return n
}

func (r *InMemoryRegistry) ReservedCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	n := 0
	for _, e := range r.entries {
		if e.tunnel.Reserved {
			n++
		}
	}
	return n
}

var _ TunnelRegistry = (*InMemoryRegistry)(nil)
