package registry

import (
	"context"
	"io"
	"sync"
	"testing"
	"time"
)

type fakeConn struct {
	id     string
	userID string
	done   chan struct{}
}

func newFakeConn(id, userID string) *fakeConn {
	return &fakeConn{id: id, userID: userID, done: make(chan struct{})}
}

func (f *fakeConn) ID() string            { return f.id }
func (f *fakeConn) UserID() string        { return f.userID }
func (f *fakeConn) Done() <-chan struct{} { return f.done }
func (f *fakeConn) Close() error          { close(f.done); return nil }
func (f *fakeConn) Dial(ctx context.Context, addr string, port uint32) (io.ReadWriteCloser, error) {
	return nil, nil
}

func TestRegister_DuplicateSubdomainFails(t *testing.T) {
	r := New(50*time.Millisecond, nil)
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
	r := New(50*time.Millisecond, nil)
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
	r.UpdateActivity("sticky")

	time.Sleep(grace)
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

func TestIsDisconnected(t *testing.T) {
	r := New(200*time.Millisecond, nil)
	_ = r.Register(&Tunnel{Subdomain: "live", Conn: newFakeConn("1", "")})

	if r.IsDisconnected("live") {
		t.Fatal("expected live tunnel to not be disconnected")
	}
	if r.IsDisconnected("nonexistent") {
		t.Fatal("expected nonexistent to not be disconnected")
	}

	r.MarkDisconnected("live")
	if !r.IsDisconnected("live") {
		t.Fatal("expected disconnected tunnel to report as disconnected")
	}
}

func TestReclaim_ReplacesConnOnDisconnectedEntry(t *testing.T) {
	grace := 200 * time.Millisecond
	r := New(grace, nil)
	oldConn := newFakeConn("old", "u1")
	_ = r.Register(&Tunnel{Subdomain: "reserved", UserID: "u1", Reserved: true, BindAddr: "0.0.0.0", BindPort: 80, Conn: oldConn})

	r.MarkDisconnected("reserved")
	if !r.IsDisconnected("reserved") {
		t.Fatal("expected disconnected after MarkDisconnected")
	}

	newConn := newFakeConn("new", "u1")
	if err := r.Reclaim("reserved", newConn, "0.0.0.0", 3000); err != nil {
		t.Fatalf("Reclaim should succeed on disconnected entry, got %v", err)
	}

	if r.IsDisconnected("reserved") {
		t.Fatal("expected tunnel to not be disconnected after Reclaim")
	}
	tun, ok := r.Lookup("reserved")
	if !ok {
		t.Fatal("expected Lookup to succeed after Reclaim")
	}
	if tun.Conn.ID() != "new" {
		t.Fatalf("expected new conn, got %s", tun.Conn.ID())
	}
	if tun.BindPort != 3000 {
		t.Fatalf("expected updated BindPort 3000, got %d", tun.BindPort)
	}
}

func TestReclaim_FailsOnActiveEntry(t *testing.T) {
	r := New(200*time.Millisecond, nil)
	_ = r.Register(&Tunnel{Subdomain: "active", Conn: newFakeConn("1", "")})

	if err := r.Reclaim("active", newFakeConn("2", ""), "0.0.0.0", 80); err != ErrSubdomainTaken {
		t.Fatalf("expected ErrSubdomainTaken on active entry, got %v", err)
	}
}

func TestCounts_AnonymousAndReserved(t *testing.T) {
	r := New(50*time.Millisecond, nil)
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

func TestConcurrentRegisterLookupUnregister_Race(t *testing.T) {
	r := New(20*time.Millisecond, nil)
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

	_ = r.ActiveCount()
}

func TestRegister_UserTunnelLimitEnforced(t *testing.T) {
	r := New(50*time.Millisecond, nil)
	t1 := &Tunnel{Subdomain: "sub1", UserID: "u123", MaxActiveTunnels: 1, Conn: newFakeConn("1", "u123")}
	t2 := &Tunnel{Subdomain: "sub2", UserID: "u123", MaxActiveTunnels: 1, Conn: newFakeConn("2", "u123")}

	if err := r.Register(t1); err != nil {
		t.Fatalf("first user register should succeed, got %v", err)
	}
	if err := r.Register(t2); err != ErrUserTunnelLimitReached {
		t.Fatalf("expected ErrUserTunnelLimitReached, got %v", err)
	}
}

func TestRegister_PlanBasedTunnelLimit(t *testing.T) {
	r := New(50*time.Millisecond, nil)

	for i := 0; i < 3; i++ {
		tn := &Tunnel{
			Subdomain:        subdomainFor(i),
			UserID:           "u1",
			MaxActiveTunnels: 3,
			Conn:             newFakeConn(subdomainFor(i), "u1"),
		}
		if err := r.Register(tn); err != nil {
			t.Fatalf("register %d should succeed, got %v", i, err)
		}
	}

	t4 := &Tunnel{Subdomain: "extra", UserID: "u1", MaxActiveTunnels: 3, Conn: newFakeConn("extra", "u1")}
	if err := r.Register(t4); err != ErrUserTunnelLimitReached {
		t.Fatalf("expected ErrUserTunnelLimitReached, got %v", err)
	}
}

func TestRegister_UnlimitedWhenMaxActiveTunnelsZero(t *testing.T) {
	r := New(50*time.Millisecond, nil)
	for i := 0; i < 5; i++ {
		tn := &Tunnel{
			Subdomain:        subdomainFor(i),
			UserID:           "u1",
			MaxActiveTunnels: 0,
			Conn:             newFakeConn(subdomainFor(i), "u1"),
		}
		if err := r.Register(tn); err != nil {
			t.Fatalf("register %d should succeed with unlimited, got %v", i, err)
		}
	}
}

func TestRegister_AnonymousDuplicateDeviceRejected(t *testing.T) {
	r := New(50*time.Millisecond, nil)
	t1 := &Tunnel{Subdomain: "anon1", DeviceID: "SHA256:abc123", Conn: newFakeConn("1", "")}
	t2 := &Tunnel{Subdomain: "anon2", DeviceID: "SHA256:abc123", Conn: newFakeConn("2", "")}

	if err := r.Register(t1); err != nil {
		t.Fatalf("first anonymous register should succeed, got %v", err)
	}
	if err := r.Register(t2); err != ErrAnonymousTunnelExists {
		t.Fatalf("expected ErrAnonymousTunnelExists, got %v", err)
	}
}

func TestRegister_AnonymousDifferentDevicesAllowed(t *testing.T) {
	r := New(50*time.Millisecond, nil)
	t1 := &Tunnel{Subdomain: "anon1", DeviceID: "SHA256:device1", Conn: newFakeConn("1", "")}
	t2 := &Tunnel{Subdomain: "anon2", DeviceID: "SHA256:device2", Conn: newFakeConn("2", "")}

	if err := r.Register(t1); err != nil {
		t.Fatalf("first device register should succeed, got %v", err)
	}
	if err := r.Register(t2); err != nil {
		t.Fatalf("different device register should succeed, got %v", err)
	}
}

func TestRegister_AnonymousEmptyDeviceIDSkipsDedup(t *testing.T) {
	r := New(50*time.Millisecond, nil)
	for i := 0; i < 3; i++ {
		tn := &Tunnel{Subdomain: subdomainFor(i + 10), Conn: newFakeConn(subdomainFor(i+10), "")}
		if err := r.Register(tn); err != nil {
			t.Fatalf("anonymous register %d with no deviceID should succeed, got %v", i, err)
		}
	}
}

func TestRegister_AnonymousDeviceDedupIgnoresDisconnected(t *testing.T) {
	r := New(200*time.Millisecond, nil)
	t1 := &Tunnel{Subdomain: "anon1", DeviceID: "SHA256:samedev", Conn: newFakeConn("1", "")}
	if err := r.Register(t1); err != nil {
		t.Fatalf("first register should succeed, got %v", err)
	}

	r.MarkDisconnected("anon1")

	t2 := &Tunnel{Subdomain: "anon2", DeviceID: "SHA256:samedev", Conn: newFakeConn("2", "")}
	if err := r.Register(t2); err != nil {
		t.Fatalf("register after disconnect should succeed, got %v", err)
	}
}

func subdomainFor(i int) string {
	return string(rune('a'+(i%26))) + "-race-sub"
}
