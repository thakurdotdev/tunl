package main

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/yourorg/tunnel-saas/tunnel-server/internal/config"
	"github.com/yourorg/tunnel-saas/tunnel-server/internal/controlclient"
	"github.com/yourorg/tunnel-saas/tunnel-server/internal/health"
	"github.com/yourorg/tunnel-saas/tunnel-server/internal/httpproxy"
	"github.com/yourorg/tunnel-saas/tunnel-server/internal/logging"
	"github.com/yourorg/tunnel-saas/tunnel-server/internal/registry"
	"github.com/yourorg/tunnel-saas/tunnel-server/internal/sshserver"
	"golang.org/x/crypto/ssh"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	logger := logging.Init(getEnv("LOG_LEVEL", "info"))

	reg := registry.New(cfg.ReconnectGraceWindow, cfg.ReservedSubdomains)

	ccClient := controlclient.New(controlclient.Options{
		BaseURL:      cfg.ControlPlaneURL,
		SharedSecret: cfg.InternalSharedSecret,
		CacheTTL:     cfg.CacheTTL,
	})
	_ = ccClient // TODO(step 13): wrap as sshserver.KeyValidator

	hostKey, err := loadOrGenerateHostKey()
	if err != nil {
		logger.Error("failed to generate ssh host key", "error", err)
		os.Exit(1)
	}

	sshSrv := sshserver.New(sshserver.Options{
		ListenAddr:       cfg.SSHListenAddr,
		BaseDomain:       cfg.BaseDomain,
		URLScheme:        cfg.TunnelURLScheme,
		Registry:         reg,
		SubdomainRetries: cfg.SubdomainRetries,
		HostKey:          hostKey,
		Logger:           logger,
	})

	proxyHandler := httpproxy.NewHandler(httpproxy.Options{
		Registry:    reg,
		BaseDomain:  cfg.BaseDomain,
		DialTimeout: 10 * time.Second,
		Logger:      logger,
	})

	healthHandler := health.NewHandler(reg)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
	go func() {
		<-sigCh
		logger.Info("shutting down")
		cancel()
	}()

	go func() {
		if err := sshSrv.ListenAndServe(ctx); err != nil {
			logger.Error("ssh server stopped", "error", err)
		}
	}()

	go func() {
		logger.Info("http proxy listening", "addr", cfg.HTTPListenAddr)
		if err := http.ListenAndServe(cfg.HTTPListenAddr, proxyHandler); err != nil {
			logger.Error("http proxy stopped", "error", err)
		}
	}()

	if cfg.TLSCertPath != "" && cfg.TLSKeyPath != "" {
		go func() {
			logger.Info("https proxy listening", "addr", cfg.HTTPSListenAddr)
			if err := http.ListenAndServeTLS(cfg.HTTPSListenAddr, cfg.TLSCertPath, cfg.TLSKeyPath, proxyHandler); err != nil {
				logger.Error("https proxy stopped", "error", err)
			}
		}()
	}

	go func() {
		logger.Info("health server listening", "addr", cfg.HealthListenAddr)
		if err := http.ListenAndServe(cfg.HealthListenAddr, healthHandler); err != nil {
			logger.Error("health server stopped", "error", err)
		}
	}()

	<-ctx.Done()
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func loadOrGenerateHostKey() (ssh.Signer, error) {
	if path := os.Getenv("SSH_HOST_KEY_PATH"); path != "" {
		keyBytes, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("read host key %s: %w", path, err)
		}
		return ssh.ParsePrivateKey(keyBytes)
	}
	// Ephemeral key for local dev — changes every restart.
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, err
	}
	return ssh.NewSignerFromKey(key)
}
