package registry

import (
	"context"
	"io"
	"sync"
	"testing"
	"time"
)

// fakeConn is a minimal TunnelConnection for tests — no real network I/O.
type fakeConn struct {
	id     string
	userID string
	done   chan struct{}
}

func newFakeConn(id, userID string) *fakeConn {
	return &fakeConn{id: id, userID: userID, done: make(chan struct{})}
}

func (f *fakeConn) ID() string                { return f.id }
func (f *fakeConn) UserID() string            { return f.userID }
func (f *fakeConn) Done() <-chan struct{}     { return f.done }
func (f *fakeConn) Close() error              { close(f.done); return nil }
func (f *fakeConn) Dial(ctx context.Context, addr string, port uint32) (io.ReadWriteCloser, error) {
	return nil, nil
}

func TestRegister_DuplicateSubdomainFails(t *testing.T) {
	r := New(50 * time.Millisecond, nil)
	t1 := &Tunnel{Subdomain: "abc123", Conn: newFakeConn("1", "")}
	t2 := &Tunnel{Subdomain: "abc123", Conn: newFakeConn("2", "")}

	if err := r.Register(t1); err != nil {
		t.Fatalf("first register should succeed, got %v", err)
	}
	if err := r.Register(t2); err != ErrSubdomainTaken {
		t.Fatalf("expected ErrSubdomainTaken, got %v", err)
	}
}

func TestLookup_AfterUnregisterReturnsFalse(t *testing.T) {
	r := New(50 * time.Millisecond, nil)
	tn := &Tunnel{Subdomain: "gone", Conn: newFakeConn("1", "")}
	_ = r.Register(tn)
	r.Unregister("gone")

	if _, ok := r.Lookup("gone"); ok {
		t.Fatalf("expected Lookup to return false after Unregister")
	}
}

func TestMarkDisconnected_ReconnectWithinGraceWindowCancelsRemoval(t *testing.T) {
	grace := 100 * time.Millisecond
	r := New(grace, nil)
	tn := &Tunnel{Subdomain: "sticky", Conn: newFakeConn("1", "")}
	_ = r.Register(tn)

	r.MarkDisconnected("sticky")
	time.Sleep(grace / 2)
	r.UpdateActivity("sticky") // reconnect before the timer fires

	time.Sleep(grace) // long enough that the original timer would've fired
	if _, ok := r.Lookup("sticky"); !ok {
		t.Fatalf("expected tunnel to survive reconnect within grace window")
	}
}

func TestMarkDisconnected_NoReconnectRemovesAfterGraceWindow(t *testing.T) {
	grace := 50 * time.Millisecond
	r := New(grace, nil)
	tn := &Tunnel{Subdomain: "expiring", Conn: newFakeConn("1", "")}
	_ = r.Register(tn)

	r.MarkDisconnected("expiring")
	time.Sleep(grace * 3)

	if _, ok := r.Lookup("expiring"); ok {
		t.Fatalf("expected tunnel to be removed after grace window with no reconnect")
	}
}

func TestCounts_AnonymousAndReserved(t *testing.T) {
	r := New(50 * time.Millisecond, nil)
	_ = r.Register(&Tunnel{Subdomain: "anon1", Reserved: false, Conn: newFakeConn("1", "")})
	_ = r.Register(&Tunnel{Subdomain: "anon2", Reserved: false, Conn: newFakeConn("2", "")})
	_ = r.Register(&Tunnel{Subdomain: "res1", Reserved: true, UserID: "u1", Conn: newFakeConn("3", "u1")})

	if got := r.ActiveCount(); got != 3 {
		t.Errorf("ActiveCount = %d, want 3", got)
	}
	if got := r.AnonymousCount(); got != 2 {
		t.Errorf("AnonymousCount = %d, want 2", got)
	}
	if got := r.ReservedCount(); got != 1 {
		t.Errorf("ReservedCount = %d, want 1", got)
	}
}

// Run with `go test -race ./...` — this is the test the plan calls out
// explicitly (section 1.3 step 3 / section 5).
func TestConcurrentRegisterLookupUnregister_Race(t *testing.T) {
	r := New(20 * time.Millisecond, nil)
	var wg sync.WaitGroup

	for i := 0; i < 50; i++ {
		i := i
		wg.Add(3)
		go func() {
			defer wg.Done()
			sub := subdomainFor(i)
			_ = r.Register(&Tunnel{Subdomain: sub, Conn: newFakeConn(sub, "")})
		}()
		go func() {
			defer wg.Done()
			r.Lookup(subdomainFor(i))
		}()
		go func() {
			defer wg.Done()
			r.Unregister(subdomainFor(i))
		}()
	}
	wg.Wait()

	// No assertion beyond "didn't race" — that's what -race is for.
	_ = r.ActiveCount()
}

func subdomainFor(i int) string {
	return string(rune('a'+(i%26))) + "-race-sub"
}
