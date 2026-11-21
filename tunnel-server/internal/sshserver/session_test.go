package sshserver

import (
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// overlapWriter fails the test if two writes ever overlap, which is what
// corrupted the SSH stream under concurrent requests.
type overlapWriter struct {
	t      *testing.T
	active atomic.Int32
	lines  atomic.Int32
	block  chan struct{}
}

func (w *overlapWriter) Write(p []byte) (int, error) {
	if w.active.Add(1) != 1 {
		w.t.Error("concurrent write to session channel")
	}
	if w.block != nil {
		<-w.block
	}
	time.Sleep(100 * time.Microsecond)
	w.lines.Add(1)
	w.active.Add(-1)
	return len(p), nil
}

func newTestSession() *sshSession {
	return newSSHSession("id", "", "", "", nil, "", "1.2.3.4", "dev", 0, nil, nil, nil, nil)
}

func TestWriteTerminalLogSerializesConcurrentWrites(t *testing.T) {
	sess := newTestSession()
	defer sess.Close()
	w := &overlapWriter{t: t}
	sess.setTerminalWriter(w)

	var wg sync.WaitGroup
	for range 200 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			sess.WriteTerminalLog("GET / 200")
		}()
	}
	wg.Wait()
	deadline := time.Now().Add(2 * time.Second)
	for w.lines.Load() < 200 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if got := w.lines.Load(); got != 200 {
		t.Fatalf("want 200 lines written, got %d", got)
	}
}

func TestWriteTerminalLogNeverBlocksOnStuckTerminal(t *testing.T) {
	sess := newTestSession()
	defer sess.Close()
	w := &overlapWriter{t: t, block: make(chan struct{})}
	defer close(w.block)
	sess.setTerminalWriter(w)

	done := make(chan struct{})
	go func() {
		for range terminalLogQueueSize * 4 {
			sess.WriteTerminalLog("GET / 200")
		}
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("WriteTerminalLog blocked behind a terminal that isn't reading")
	}
	if sess.droppedLogs.Load() == 0 {
		t.Fatal("expected overflow lines to be dropped")
	}
}

func TestLockedChannelImplementsReadWriter(t *testing.T) {
	sess := newTestSession()
	defer sess.Close()
	sess.setTerminalWriter(&lockedChannel{})
	if sess.termRW == nil {
		t.Fatal("prompts need the locked channel to still be readable")
	}
}
