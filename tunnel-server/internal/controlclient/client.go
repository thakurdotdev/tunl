package controlclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

type Client struct {
	baseURL      string
	sharedSecret string
	httpClient   *http.Client
	log          *slog.Logger
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
	}
}

type validateKeyResponse struct {
	UserID           string  `json:"userId"`
	Email            string  `json:"email"`
	AllowedSubdomain *string `json:"allowedSubdomain"`
	Plan             string  `json:"plan"`
	MaxActiveTunnels int     `json:"maxActiveTunnels"`
}


func (c *Client) ValidateKey(ctx context.Context, fingerprint string) (userID, email, allowedSubdomain, plan string, maxActiveTunnels int, ok bool) {
	body, _ := json.Marshal(map[string]string{"fingerprint": fingerprint})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/internal/validate-key", bytes.NewReader(body))
	if err != nil {
		return "", "", "", "", 0, false
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Token", c.sharedSecret)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.log.Warn("validate-key request failed", "error", err)
		return "", "", "", "", 0, false
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return "", "", "", "", 0, false
	}
	if resp.StatusCode != http.StatusOK {
		c.log.Warn("validate-key unexpected status", "status", resp.StatusCode, "fingerprint", fingerprint)
		return "", "", "", "", 0, false
	}

	var r validateKeyResponse
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return "", "", "", "", 0, false
	}

	return r.UserID, r.Email, optionalSubdomain(r.AllowedSubdomain), r.Plan, r.MaxActiveTunnels, true
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

func (c *Client) ReportConnected(ctx context.Context, userID, subdomain, remoteIP string) {
	body, _ := json.Marshal(map[string]string{
		"userId":    userID,
		"subdomain": subdomain,
		"remoteIp":  remoteIP,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/internal/tunnel-connected", bytes.NewReader(body))
	if err != nil {
		c.log.Warn("tunnel-connected request build failed", "error", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Token", c.sharedSecret)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.log.Warn("tunnel-connected request failed", "error", err, "subdomain", subdomain)
		return
	}
	resp.Body.Close()
}

func (c *Client) ReportDisconnected(ctx context.Context, userID, subdomain string) {
	body, _ := json.Marshal(map[string]string{
		"userId":    userID,
		"subdomain": subdomain,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/internal/tunnel-disconnected", bytes.NewReader(body))
	if err != nil {
		c.log.Warn("tunnel-disconnected request build failed", "error", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Token", c.sharedSecret)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.log.Warn("tunnel-disconnected request failed", "error", err, "subdomain", subdomain)
		return
	}
	resp.Body.Close()
}

func (c *Client) ReportHeartbeat(ctx context.Context, userID, subdomain string) {
	body, _ := json.Marshal(map[string]string{
		"userId":    userID,
		"subdomain": subdomain,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/internal/tunnel-heartbeat", bytes.NewReader(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Token", c.sharedSecret)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return
	}
	resp.Body.Close()
}
