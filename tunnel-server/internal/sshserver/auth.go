package sshserver

import (
	"fmt"
	"log/slog"
	"strconv"
	"sync"

	"golang.org/x/crypto/ssh"
)

type KeyValidator interface {
	ValidateKey(fingerprint string) (userID, email, allowedSubdomain, plan string, maxActiveTunnels int, ok bool)
}

type anonymousKeyValidator struct{}

func (anonymousKeyValidator) ValidateKey(fingerprint string) (string, string, string, string, int, bool) {
	return "", "", "", "", 0, false
}

// deviceFingerprintStore captures the first SSH key fingerprint seen per
// connection, keyed by RemoteAddr. This fingerprint serves as a device
// identifier for anonymous tunnel deduplication.
type deviceFingerprintStore struct {
	m sync.Map
}

func (s *deviceFingerprintStore) store(remoteAddr, fingerprint string) {
	s.m.LoadOrStore(remoteAddr, fingerprint)
}

func (s *deviceFingerprintStore) take(remoteAddr string) string {
	v, ok := s.m.LoadAndDelete(remoteAddr)
	if !ok {
		return ""
	}
	return v.(string)
}

func buildAuthCallback(kv KeyValidator, fps *deviceFingerprintStore, log *slog.Logger) func(ssh.ConnMetadata, ssh.PublicKey) (*ssh.Permissions, error) {
	return func(meta ssh.ConnMetadata, key ssh.PublicKey) (*ssh.Permissions, error) {
		fingerprint := ssh.FingerprintSHA256(key)
		userID, email, allowedSubdomain, plan, maxActiveTunnels, ok := kv.ValidateKey(fingerprint)
		if log != nil {
			log.Info("ssh key validation check", "fingerprint", fingerprint, "valid", ok, "user_id", userID, "email", email)
		}
		if !ok {
			fps.store(meta.RemoteAddr().String(), fingerprint)
			return nil, fmt.Errorf("unknown key")
		}
		return &ssh.Permissions{
			Extensions: map[string]string{
				"user_id":            userID,
				"email":              email,
				"allowed_subdomain":  allowedSubdomain,
				"plan":               plan,
				"max_active_tunnels": strconv.Itoa(maxActiveTunnels),
			},
		}, nil
	}
}
