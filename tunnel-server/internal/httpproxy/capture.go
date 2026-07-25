package httpproxy

import (
	"bytes"
	"crypto/rand"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/thakurdotdev/tunl/tunnel-server/internal/requestlog"
)

type responseCapture struct {
	http.ResponseWriter
	statusCode int
	body       bytes.Buffer
	maxBody    int
	written    int64
}

func (r *responseCapture) WriteHeader(code int) {
	r.statusCode = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *responseCapture) Write(b []byte) (int, error) {
	n, err := r.ResponseWriter.Write(b)
	if remaining := r.maxBody - r.body.Len(); remaining > 0 && n > 0 {
		capture := n
		if capture > remaining {
			capture = remaining
		}
		r.body.Write(b[:capture])
	}
	r.written += int64(n)
	return n, err
}

func captureRequestBody(r *http.Request, maxSize int) (string, int64) {
	if r.Body == nil {
		return "", 0
	}
	var capturedBuf bytes.Buffer
	lr := io.LimitReader(r.Body, int64(maxSize))
	nCaptured, _ := io.Copy(&capturedBuf, lr)
	remaining, _ := io.Copy(io.Discard, r.Body)
	totalSize := nCaptured + remaining

	// Reconstruct r.Body so downstream proxying can still read it
	r.Body = io.NopCloser(io.MultiReader(bytes.NewReader(capturedBuf.Bytes()), r.Body))

	return capturedBuf.String(), totalSize
}

func flattenHeaders(h http.Header) map[string]string {
	flat := make(map[string]string, len(h))
	for k, v := range h {
		flat[k] = strings.Join(v, ", ")
	}
	return flat
}

func captureID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x", b)
}

// CaptureMiddleware wraps an http.Handler and publishes request/response
// metadata to the requestlog publisher for authenticated tunnels.
func CaptureMiddleware(next http.Handler, publisher *requestlog.Publisher, subdomainExtractor func(string) string) http.Handler {
	if publisher == nil {
		return next
	}
	maxBody := publisher.MaxBodySize()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		subdomain := subdomainExtractor(r.Host)
		if subdomain == "" {
			next.ServeHTTP(w, r)
			return
		}

		reqBody, reqSize := captureRequestBody(r, maxBody)
		start := time.Now()

		rc := &responseCapture{
			ResponseWriter: w,
			statusCode:     200,
			maxBody:        maxBody,
		}

		next.ServeHTTP(rc, r)

		respBody := rc.body.String()
		if edgeErr := rc.Header().Get("X-Tunl-Edge-Error"); edgeErr != "" {
			respBody = fmt.Sprintf("[%d %s: %s]", rc.statusCode, http.StatusText(rc.statusCode), edgeErr)
		}

		entry := &requestlog.CapturedRequest{
			ID:              captureID(),
			Timestamp:       start,
			Method:          r.Method,
			Path:            r.URL.RequestURI(),
			StatusCode:      rc.statusCode,
			DurationMs:      time.Since(start).Milliseconds(),
			RequestSize:     reqSize,
			ResponseSize:    rc.written,
			RequestHeaders:  flattenHeaders(r.Header),
			ResponseHeaders: flattenHeaders(rc.Header()),
			RequestBody:     reqBody,
			ResponseBody:    respBody,
			ClientIP:        extractClientIP(r),
		}

		publisher.Publish(subdomain, entry)
	})
}

func extractClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if parts := strings.SplitN(xff, ",", 2); len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}
	if host, _, err := strings.Cut(r.RemoteAddr, ":"); err {
		return host
	}
	return r.RemoteAddr
}
