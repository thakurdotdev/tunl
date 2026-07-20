// Package config loads all tunneld configuration from the environment.
// Load this first in main.go — every other package assumes a populated
// Config already exists (see plan section 1.3, step 1).
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	// BaseDomain is the root domain tunnels are issued under, e.g. "thakur.dev".
	BaseDomain string

	// TunnelURLScheme is "https" (default) or "http", used when generating the
	// tunnel URL shown to the user. Use "https" when Cloudflare/reverse-proxy
	// terminates TLS in front of the tunnel server.
	TunnelURLScheme string

	// SSHListenAddr is where the tunnel SSH server listens.
	// NOT port 22 — that's your own admin SSH. See plan's port-choice design note.
	SSHListenAddr string

	// HTTPListenAddr / HTTPSListenAddr are the public-facing proxy listeners.
	HTTPListenAddr  string
	HTTPSListenAddr string

	// TLS: single wildcard cert for *.<BaseDomain>. ACME is out of scope for now.
	TLSCertPath string
	TLSKeyPath  string

	// HealthListenAddr serves /health, /ready, /metrics.
	HealthListenAddr string

	// ControlPlaneURL is the NestJS internal API base, e.g. http://localhost:3001.
	ControlPlaneURL      string
	InternalSharedSecret string

	// CacheTTL controls how long controlclient caches ValidateKey results.
	// Deliberate consistency/latency tradeoff — see plan's cache-staleness note.
	CacheTTL time.Duration

	// SubdomainRetries is how many times to retry random subdomain generation
	// on a Register collision before giving up (plan step 4).
	SubdomainRetries int

	// ReconnectGraceWindow is how long a disconnected tunnel's subdomain stays
	// reserved before being freed (plan's grace-window design note).
	ReconnectGraceWindow time.Duration

	MaxConnsPerIP            int
	MaxAnonymousTunnelsPerIP int

	// ReservedSubdomains are existing subdomains that must never be assigned
	// to tunnels (e.g. "blog,api,www" to protect blog.thakur.dev, etc.).
	ReservedSubdomains map[string]struct{}
}

func Load() (*Config, error) {
	loadDotEnv()
	cfg := &Config{
		BaseDomain:               getEnv("BASE_DOMAIN", "thakur.dev"),
		TunnelURLScheme:          getEnv("TUNNEL_URL_SCHEME", "https"),
		SSHListenAddr:            getEnv("SSH_LISTEN_ADDR", ":2222"),
		HTTPListenAddr:           getEnv("HTTP_LISTEN_ADDR", ":8080"),
		HTTPSListenAddr:          getEnv("HTTPS_LISTEN_ADDR", ":8443"),
		TLSCertPath:              getEnv("TLS_CERT_PATH", ""),
		TLSKeyPath:               getEnv("TLS_KEY_PATH", ""),
		HealthListenAddr:         getEnv("HEALTH_LISTEN_ADDR", ":9090"),
		ControlPlaneURL:          getEnv("CONTROL_PLANE_URL", "http://localhost:3001"),
		InternalSharedSecret:     strings.TrimSpace(getEnv("INTERNAL_SHARED_SECRET", "changeme-shared-secret-at-least-16-chars")),
		SubdomainRetries:         getEnvInt("SUBDOMAIN_RETRIES", 5),
		MaxConnsPerIP:            getEnvInt("MAX_CONNS_PER_IP", 10),
		MaxAnonymousTunnelsPerIP: getEnvInt("MAX_ANONYMOUS_TUNNELS_PER_IP", 1),
	}

	cacheTTLSeconds := getEnvInt("CACHE_TTL_SECONDS", 300) // 5 min default
	cfg.CacheTTL = time.Duration(cacheTTLSeconds) * time.Second

	graceSeconds := getEnvInt("RECONNECT_GRACE_SECONDS", 12)
	cfg.ReconnectGraceWindow = time.Duration(graceSeconds) * time.Second

	cfg.ReservedSubdomains = parseReservedSubdomains(getEnv("RESERVED_SUBDOMAINS", ""))

	if cfg.InternalSharedSecret == "" {
		return nil, fmt.Errorf("INTERNAL_SHARED_SECRET is required")
	}

	return cfg, nil
}

func loadDotEnv() {
	data, err := os.ReadFile(".env")
	if err != nil {
		return
	}
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			k := strings.TrimSpace(parts[0])
			v := strings.TrimSpace(parts[1])
			v = strings.Trim(v, `"'`)
			if os.Getenv(k) == "" {
				os.Setenv(k, v)
			}
		}
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func parseReservedSubdomains(raw string) map[string]struct{} {
	m := make(map[string]struct{})
	if raw == "" {
		return m
	}
	for _, s := range strings.Split(raw, ",") {
		s = strings.TrimSpace(strings.ToLower(s))
		if s != "" {
			m[s] = struct{}{}
		}
	}
	return m
}
