package httpproxy

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/thakurdotdev/tunl/tunnel-server/internal/registry"
)

// tcpTunnel is a TunnelConnection whose Dial reaches a local test server,
// standing in for the SSH forwarded-tcpip channel.
type tcpTunnel struct{ addr string }

func (c *tcpTunnel) ID() string              { return "t" }
func (c *tcpTunnel) UserID() string          { return "" }
func (c *tcpTunnel) Done() <-chan struct{}   { return nil }
func (c *tcpTunnel) Close() error            { return nil }
func (c *tcpTunnel) WriteTerminalLog(string) {}
func (c *tcpTunnel) Dial(ctx context.Context, _ string, _ uint32) (io.ReadWriteCloser, error) {
	var d net.Dialer
	return d.DialContext(ctx, "tcp", c.addr)
}

type nopMetrics struct{}

func (nopMetrics) RecordUsage(string, int64, int64, int64, bool) {}

// edge builds the production handler chain (capture → proxy) in front of app.
func edge(t *testing.T, app http.Handler, userID string, lim Limits) *httptest.Server {
	t.Helper()
	backend := httptest.NewServer(app)
	t.Cleanup(backend.Close)
	reg := registry.New(time.Second, nil, 0)
	if err := reg.Register(&registry.Tunnel{
		Subdomain: "app", UserID: userID,
		Conn: &tcpTunnel{addr: backend.Listener.Addr().String()},
	}); err != nil {
		t.Fatal(err)
	}
	proxy := NewHandler(Options{
		Registry: reg, BaseDomain: "tunl.dev", DialTimeout: time.Second,
		Logger: slog.New(slog.NewTextHandler(io.Discard, nil)), Limits: lim,
	})
	front := httptest.NewServer(CaptureMiddleware(proxy, nil, nopMetrics{}, SubdomainExtractor("tunl.dev")))
	t.Cleanup(front.Close)
	return front
}

func get(t *testing.T, front *httptest.Server, method, path string, body io.Reader) *http.Response {
	t.Helper()
	req, _ := http.NewRequest(method, front.URL+path, body)
	req.Host = "app.tunl.dev"
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	return resp
}

func TestWebSocketUpgradeThroughCapture(t *testing.T) {
	app := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, rw, err := http.NewResponseController(w).Hijack()
		if err != nil {
			t.Error(err)
			return
		}
		defer conn.Close()
		rw.WriteString("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n")
		rw.Flush()
		line, _ := rw.ReadString('\n')
		rw.WriteString("echo:" + line)
		rw.Flush()
	})
	front := edge(t, app, "", Limits{})

	conn, err := net.Dial("tcp", front.Listener.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	fmt.Fprint(conn, "GET /ws HTTP/1.1\r\nHost: app.tunl.dev\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n")
	br := bufio.NewReader(conn)
	resp, err := http.ReadResponse(br, nil)
	if err != nil || resp.StatusCode != http.StatusSwitchingProtocols {
		t.Fatalf("want 101, got %v %v", resp.Status, err)
	}
	fmt.Fprint(conn, "hello\n")
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	if line, _ := br.ReadString('\n'); line != "echo:hello\n" {
		t.Fatalf("websocket relay broken, got %q", line)
	}
}

func TestStreamingResponsesFlushThroughCapture(t *testing.T) {
	app := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		fmt.Fprint(w, "data: 1\n\n")
		w.(http.Flusher).Flush()
		time.Sleep(2 * time.Second)
		fmt.Fprint(w, "data: 2\n\n")
	})
	front := edge(t, app, "", Limits{})
	start := time.Now()
	resp := get(t, front, "GET", "/sse", nil)
	defer resp.Body.Close()
	line, _ := bufio.NewReader(resp.Body).ReadString('\n')
	if line != "data: 1\n" || time.Since(start) > time.Second {
		t.Fatalf("first event should arrive before the stream ends: %q after %v", line, time.Since(start))
	}
}

func TestBodyLimitDependsOnTier(t *testing.T) {
	app := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n, err := io.Copy(io.Discard, r.Body)
		if err != nil {
			return // MaxBytesReader tripped; proxy answers 413
		}
		fmt.Fprint(w, n)
	})
	lim := Limits{MaxBodyAnon: 1 << 20, MaxBodyUser: 4 << 20}
	body := func() io.Reader { return strings.NewReader(strings.Repeat("x", 2<<20)) }

	anon := edge(t, app, "", lim)
	if resp := get(t, anon, "POST", "/", body()); resp.StatusCode != http.StatusRequestEntityTooLarge {
		t.Fatalf("anonymous 2MB upload: want 413, got %d", resp.StatusCode)
	}
	// Chunked upload with no Content-Length is cut off mid-stream.
	pr, pw := io.Pipe()
	go func() { pw.Write([]byte(strings.Repeat("x", 2<<20))); pw.Close() }()
	if resp := get(t, anon, "POST", "/", pr); resp.StatusCode != http.StatusRequestEntityTooLarge {
		t.Fatalf("anonymous chunked 2MB upload: want 413, got %d", resp.StatusCode)
	}

	user := edge(t, app, "user-1", lim)
	resp := get(t, user, "POST", "/", body())
	got, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK || string(got) != fmt.Sprint(2<<20) {
		t.Fatalf("signed-in 2MB upload: want 200, got %d %q", resp.StatusCode, got)
	}
}

func TestInflightCapRejectsPileup(t *testing.T) {
	release := make(chan struct{})
	app := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { <-release })
	front := edge(t, app, "", Limits{MaxInflightPerTunnel: 3, InflightWait: 100 * time.Millisecond})

	var wg sync.WaitGroup
	codes := make(chan int, 10)
	for range 10 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			resp := get(t, front, "GET", "/slow", nil)
			resp.Body.Close()
			codes <- resp.StatusCode
		}()
	}
	time.Sleep(500 * time.Millisecond)
	close(release)
	wg.Wait()
	close(codes)
	count := map[int]int{}
	for c := range codes {
		count[c]++
	}
	if count[http.StatusOK] != 3 || count[http.StatusServiceUnavailable] != 7 {
		t.Fatalf("want 3 served and 7 busy, got %v", count)
	}
}
