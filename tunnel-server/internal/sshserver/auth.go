package sshserver

import (
	"log/slog"
	"strconv"

	"golang.org/x/crypto/ssh"
)

type KeyValidator interface {
	ValidateKey(fingerprint string) (userID, email, allowedSubdomain, plan string, maxActiveTunnels int, ok bool)
}

type anonymousKeyValidator struct{}

func (anonymousKeyValidator) ValidateKey(fingerprint string) (string, string, string, string, int, bool) {
	return "", "", "", "", 0, false
}

func buildAuthCallback(kv KeyValidator, log *slog.Logger) func(ssh.ConnMetadata, ssh.PublicKey) (*ssh.Permissions, error) {
	return func(meta ssh.ConnMetadata, key ssh.PublicKey) (*ssh.Permissions, error) {
		fingerprint := ssh.FingerprintSHA256(key)
		userID, email, allowedSubdomain, plan, maxActiveTunnels, ok := kv.ValidateKey(fingerprint)
		if log != nil {
			log.Info("ssh key validation check", "fingerprint", fingerprint, "valid", ok, "user_id", userID, "email", email)
		}
		if !ok {
			return nil, nil
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

