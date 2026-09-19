package controlclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math/rand/v2"
	"net/http"
	"sync"
	"time"
)

type SubdomainUsage struct {
	Subdomain       string `json:"subdomain"`
	RequestCount    int    `json:"requestCount"`
	BytesIn         int64  `json:"bytesIn"`
	BytesOut        int64  `json:"bytesOut"`
	ErrorCount      int    `json:"errorCount"`
	TotalDurationMs int64  `json:"totalDurationMs"`
}

type Client struct {
	baseURL      string
	sharedSecret string
	httpClient   *http.Client
	log          *slog.Logger
	usageMu      sync.Mutex
	usageBuckets map[string]*SubdomainUsage
}

type Options struct {
	BaseURL      string
	SharedSecret string
	Timeout      time.Duration
	Logger       *slog.Logger
}

func New(opts Options) *Client {
	timeout := opts.Timeout
	if timeout == 0 {
		timeout = 5 * time.Second
	}
	log := opts.Logger
	if log == nil {
		log = slog.Default()
	}
	return &Client{
		baseURL:      opts.BaseURL,
		sharedSecret: opts.SharedSecret,
		httpClient:   &http.Client{Timeout: timeout},
		log:          log,
		usageBuckets: make(map[string]*SubdomainUsage),
	}
}

type validateKeyResponse struct {
	UserID             string            `json:"userId"`
	Email              string            `json:"email"`
	AllowedSubdomain   *string           `json:"allowedSubdomain"`
	ReservedSubdomains []string          `json:"reservedSubdomains"`
	Plan               string            `json:"plan"`
	MaxActiveTunnels   int               `json:"maxActiveTunnels"`
	AllowedIPs         []string          `json:"allowedIps"`
	TunnelPasswords    map[string]string `json:"tunnelPasswords"`
}

func (c *Client) ValidateKey(ctx context.Context, fingerprint string) (userID, email, allowedSubdomain string, reservedSubdomains []string, plan string, maxActiveTunnels int, allowedIPs []string, tunnelPasswords map[string]string, ok bool) {
	body, _ := json.Marshal(map[string]string{"fingerprint": fingerprint})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/internal/validate-key", bytes.NewReader(body))
	if err != nil {
		return "", "", "", nil, "", 0, nil, nil, false
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Token", c.sharedSecret)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.log.Warn("validate-key request failed", "error", err)
		return "", "", "", nil, "", 0, nil, nil, false
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return "", "", "", nil, "", 0, nil, nil, false
	}
	if resp.StatusCode != http.StatusOK {
		c.log.Warn("validate-key unexpected status", "status", resp.StatusCode, "fingerprint", fingerprint)
		return "", "", "", nil, "", 0, nil, nil, false
	}

	var r validateKeyResponse
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return "", "", "", nil, "", 0, nil, nil, false
	}

	return r.UserID, r.Email, optionalSubdomain(r.AllowedSubdomain), r.ReservedSubdomains, r.Plan, r.MaxActiveTunnels, r.AllowedIPs, r.TunnelPasswords, true
}

func optionalSubdomain(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

// ReportConnected reports a new tunnel session to the control plane.
// Unlike other report methods, this uses retries because the dashboard
// depends on the session row existing to show the tunnel as active.
func (c *Client) ReportConnected(ctx context.Context, userID, deviceID, subdomain, remoteIP, plan string, connectedAt time.Time) error {
	sessionType := "authenticated"
	if userID == "" {
		sessionType = "anonymous"
	}

	payload := map[string]any{
		"anonymousId": deviceID,
		"subdomain":   subdomain,
		"remoteIp":    remoteIP,
		"sessionType": sessionType,
		"occurredAt":  connectedAt.UTC().Format(time.RFC3339Nano),
		"eventId":     subdomain + ":" + connectedAt.UTC().Format(time.RFC3339Nano) + ":connected",
	}
	if userID != "" {
		payload["userId"] = userID
	}
	if plan != "" {
		payload["plan"] = plan
	}

	return c.postWithRetry(ctx, "/internal/tunnel-connected", payload, "tunnel-connected", 3)
}

func (c *Client) ReportDisconnected(ctx context.Context, userID, deviceID, subdomain string, connectedAt time.Time) error {
	now := time.Now().UTC()
	durationMs := now.Sub(connectedAt).Milliseconds()

	payload := map[string]any{
		"anonymousId":      deviceID,
		"subdomain":        subdomain,
		"durationMs":       durationMs,
		"disconnectReason": "client_closed",
		"occurredAt":       now.Format(time.RFC3339Nano),
		"eventId":          subdomain + ":" + connectedAt.UTC().Format(time.RFC3339Nano) + ":disconnected",
	}
	if userID != "" {
		payload["userId"] = userID
	}

	return c.postWithRetry(ctx, "/internal/tunnel-disconnected", payload, "tunnel-disconnected", 3)
}

func (c *Client) ReportHeartbeat(ctx context.Context, userID, subdomain string) {
	c.post(ctx, "/internal/tunnel-heartbeat", map[string]string{
		"userId":    userID,
		"subdomain": subdomain,
	}, "tunnel-heartbeat")
}

func (c *Client) RecordUsage(subdomain string, bytesIn, bytesOut int64, durationMs int64, isError bool) {
	if subdomain == "" {
		return
	}
	c.usageMu.Lock()
	defer c.usageMu.Unlock()

	b, ok := c.usageBuckets[subdomain]
	if !ok {
		b = &SubdomainUsage{Subdomain: subdomain}
		c.usageBuckets[subdomain] = b
	}
	b.RequestCount++
	b.BytesIn += bytesIn
	b.BytesOut += bytesOut
	b.TotalDurationMs += durationMs
	if isError {
		b.ErrorCount++
	}
}

func (c *Client) FlushUsage(ctx context.Context) error {
	c.usageMu.Lock()
	if len(c.usageBuckets) == 0 {
		c.usageMu.Unlock()
		return nil
	}
	metrics := make([]SubdomainUsage, 0, len(c.usageBuckets))
	for _, b := range c.usageBuckets {
		metrics = append(metrics, *b)
	}
	c.usageBuckets = make(map[string]*SubdomainUsage)
	c.usageMu.Unlock()

	payload := map[string]any{
		"metrics": metrics,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/internal/usage", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Token", c.sharedSecret)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.log.Warn("failed to flush usage metrics", "error", err)
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}
	return nil
}

func (c *Client) StartUsageFlusher(ctx context.Context, interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				_ = c.FlushUsage(context.Background())
				return
			case <-ticker.C:
				_ = c.FlushUsage(ctx)
			}
		}
	}()
}

func (c *Client) ReportUsage(ctx context.Context, tunnelID string, bytesTransferred int64) error {
	return nil
}

// postWithRetry sends a POST with exponential backoff (200ms base).
func (c *Client) postWithRetry(ctx context.Context, path string, payload any, label string, maxRetries int) error {
	var lastErr error
	for attempt := range maxRetries {
		if err := c.doPost(ctx, path, payload); err != nil {
			lastErr = err
			backoff := time.Duration(200<<uint(attempt)) * time.Millisecond
			jitter := time.Duration(rand.IntN(100)) * time.Millisecond
			c.log.Warn(label+" failed, retrying", "attempt", attempt+1, "error", err)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff + jitter):
			}
			continue
		}
		return nil
	}
	c.log.Error(label+" failed after retries", "error", lastErr)
	return lastErr
}

func (c *Client) doPost(ctx context.Context, path string, payload any) error {
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Token", c.sharedSecret)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		errBody, _ := io.ReadAll(resp.Body)
		c.log.Error("control plane error response", "status", resp.StatusCode, "path", path, "body", string(errBody))
		return fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(errBody))
	}
	return nil
}

func (c *Client) post(ctx context.Context, path string, payload any, label string) {
	if err := c.doPost(ctx, path, payload); err != nil {
		c.log.Warn(label+" request failed", "error", err)
	}
}
