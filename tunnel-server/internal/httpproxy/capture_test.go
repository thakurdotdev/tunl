package httpproxy

import (
	"bytes"
	"io"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCaptureRequestBody_PreservesFullBodyDownstream(t *testing.T) {
	// Create a 50KB payload
	originalContent := strings.Repeat("A quick brown fox jumps over the lazy dog. ", 1200)
	req := httptest.NewRequest("POST", "http://test.tunl.dev/upload", strings.NewReader(originalContent))
	req.ContentLength = int64(len(originalContent))

	// Capture limit is only 1KB (1024 bytes)
	maxCapture := 1024
	captured, totalSize := captureRequestBody(req, maxCapture)

	if len(captured) != maxCapture {
		t.Fatalf("expected captured size %d, got %d", maxCapture, len(captured))
	}
	if totalSize != int64(len(originalContent)) {
		t.Fatalf("expected totalSize %d, got %d", len(originalContent), totalSize)
	}

	// Downstream read should receive the FULL 50KB without truncation!
	fullRead, err := io.ReadAll(req.Body)
	if err != nil {
		t.Fatalf("failed to read full body downstream: %v", err)
	}

	if len(fullRead) != len(originalContent) {
		t.Fatalf("expected downstream body length %d, got %d (body was truncated!)", len(originalContent), len(fullRead))
	}

	if !bytes.Equal(fullRead, []byte(originalContent)) {
		t.Fatal("downstream body content does not match original content")
	}
}

func TestCaptureRequestBody_SmallBody(t *testing.T) {
	content := "hello world"
	req := httptest.NewRequest("POST", "http://test.tunl.dev/api", strings.NewReader(content))
	req.ContentLength = int64(len(content))

	captured, totalSize := captureRequestBody(req, 1024)
	if captured != content {
		t.Fatalf("expected %q, got %q", content, captured)
	}
	if totalSize != int64(len(content)) {
		t.Fatalf("expected size %d, got %d", len(content), totalSize)
	}

	downstream, err := io.ReadAll(req.Body)
	if err != nil {
		t.Fatalf("failed downstream read: %v", err)
	}
	if string(downstream) != content {
		t.Fatalf("expected downstream %q, got %q", content, string(downstream))
	}
}

func TestCaptureRequestBody_NoBody(t *testing.T) {
	req := httptest.NewRequest("GET", "http://test.tunl.dev/", nil)
	captured, size := captureRequestBody(req, 1024)
	if captured != "" || size != 0 {
		t.Fatalf("expected empty capture, got %q, size %d", captured, size)
	}
}
