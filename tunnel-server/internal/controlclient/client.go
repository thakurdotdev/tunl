// Package controlclient is a thin HTTP client for tunneld -> NestJS calls.
// One package — the TTL cache (cache.go) is an implementation detail, not
// a separate module. See plan section 1.3 step 8.
package controlclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Client struct {
	baseURL      string
	sharedSecret string
	httpClient   *http.Client
	cache        *ttlCache
}

type Options struct {
	BaseURL      string
	SharedSecret string
	CacheTTL     time.Duration
	Timeout      time.Duration
}

func New(opts Options) *Client {
	timeout := opts.Timeout
	if timeout == 0 {
		timeout = 5 * time.Second
	}
	return &Client{
		baseURL:      opts.BaseURL,
		sharedSecret: opts.SharedSecret,
		httpClient:   &http.Client{Timeout: timeout},
		cache:        newTTLCache(opts.CacheTTL),
	}
}

type validateKeyResponse struct {
	UserID           string `json:"userId"`
	AllowedSubdomain *string `json:"allowedSubdomain"`
	Plan             string `json:"plan"`
}

// ValidateKey checks the cache first; on miss, calls
// POST /internal/validate-key and caches the result for CacheTTL.
// NOTE: a revoked key or downgraded plan can stay valid for up to one TTL
// window after the change lands in Postgres — deliberate tradeoff, see
// plan's cache-staleness design note.
func (c *Client) ValidateKey(ctx context.Context, fingerprint string) (userID, allowedSubdomain, plan string, ok bool) {
	if v, hit := c.cache.get(fingerprint); hit {
		r := v.(validateKeyResponse)
		return r.UserID, optionalSubdomain(r.AllowedSubdomain), r.Plan, true
	}

	body, _ := json.Marshal(map[string]string{"fingerprint": fingerprint})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/internal/validate-key", bytes.NewReader(body))
	if err != nil {
		return "", "", "", false
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Token", c.sharedSecret)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", "", "", false
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return "", "", "", false
	}
	if resp.StatusCode != http.StatusOK {
		return "", "", "", false
	}

	var r validateKeyResponse
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return "", "", "", false
	}
	c.cache.set(fingerprint, r)
	return r.UserID, optionalSubdomain(r.AllowedSubdomain), r.Plan, true
}

func optionalSubdomain(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

type usageEvent struct {
	TunnelID         string `json:"tunnelId"`
	BytesTransferred int64  `json:"bytesTransferred"`
	Timestamp        string `json:"timestamp"`
}

// ReportUsage calls POST /internal/usage. Fire-and-forget is acceptable —
// this is a stub in NestJS for now (logs only, no billing logic yet).
func (c *Client) ReportUsage(ctx context.Context, tunnelID string, bytesTransferred int64) error {
	ev := usageEvent{
		TunnelID:         tunnelID,
		BytesTransferred: bytesTransferred,
		Timestamp:        time.Now().UTC().Format(time.RFC3339),
	}
	body, _ := json.Marshal(ev)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/internal/usage", bytes.NewReader(body))
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
	if resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}
	return nil
}
