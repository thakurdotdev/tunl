package sshserver

import (
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"sync"

	"golang.org/x/crypto/ssh"
)

type KeyValidator interface {
	ValidateKey(fingerprint string) (userID, email, allowedSubdomain string, reservedSubdomains []string, plan string, maxActiveTunnels int, ok bool)
}

type anonymousKeyValidator struct{}

func (anonymousKeyValidator) ValidateKey(fingerprint string) (string, string, string, []string, string, int, bool) {
	return "", "", "", nil, "", 0, false
}

// deviceFingerprintStore captures the first SSH key fingerprint seen per
// connection keyed by RemoteAddr. Even when a key is rejected (unknown),
// we store it so it can be used as a device identifier for anonymous dedup.
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

// buildPublicKeyCallback returns the SSH public key auth callback.
//
// For registered keys: accepts and attaches user permissions.
// For unknown keys: stores fingerprint (device ID) and returns an error so the
// SSH client continues cycling through its remaining keys. This is what makes
// auth work correctly when the client's registered key is not the first offered.
func buildPublicKeyCallback(kv KeyValidator, fps *deviceFingerprintStore, log *slog.Logger) func(ssh.ConnMetadata, ssh.PublicKey) (*ssh.Permissions, error) {
	return func(meta ssh.ConnMetadata, key ssh.PublicKey) (*ssh.Permissions, error) {
		fingerprint := ssh.FingerprintSHA256(key)
		userID, email, allowedSubdomain, reservedSubdomains, plan, maxActiveTunnels, ok := kv.ValidateKey(fingerprint)
		if log != nil {
			log.Info("ssh key validation", "fingerprint", fingerprint, "valid", ok)
		}
		if !ok {
			fps.store(meta.RemoteAddr().String(), fingerprint)
			return nil, fmt.Errorf("unknown key")
		}
		return &ssh.Permissions{
			Extensions: map[string]string{
				"user_id":             userID,
				"email":               email,
				"allowed_subdomain":   allowedSubdomain,
				"reserved_subdomains": strings.Join(reservedSubdomains, ","),
				"plan":                plan,
				"max_active_tunnels":  strconv.Itoa(maxActiveTunnels),
			},
		}, nil
	}
}

// buildKeyboardInteractiveCallback returns an anonymous-fallback auth callback.
//
// When all public key attempts fail (unknown keys or no keys at all), the SSH
// client moves on to keyboard-interactive. We send zero questions — no prompt
// is shown to the user — and accept immediately as anonymous. Any fingerprints
// captured from the failed pubkey phase are retrieved in handleConn as deviceID.
func buildKeyboardInteractiveCallback() func(ssh.ConnMetadata, ssh.KeyboardInteractiveChallenge) (*ssh.Permissions, error) {
	return func(_ ssh.ConnMetadata, challenge ssh.KeyboardInteractiveChallenge) (*ssh.Permissions, error) {
		// Zero questions = no terminal prompt. The client sends an empty answer
		// list and auth succeeds silently.
		if _, err := challenge("", "", []string{}, []bool{}); err != nil {
			return nil, err
		}
		return &ssh.Permissions{}, nil
	}
}
