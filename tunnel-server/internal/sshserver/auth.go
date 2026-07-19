// auth.go implements the PublicKeyCallback (and anonymous fallback) for the
// SSH server. Step 4 of the plan: stand this up permissive/anonymous-only
// first. Step 13 wires in the real controlclient.KeyValidator call.
package sshserver

import (
	"golang.org/x/crypto/ssh"
)

// KeyValidator is the subset of controlclient.Client that auth.go needs.
// Defined here (not imported directly) to keep sshserver decoupled from
// controlclient's HTTP/caching details — main.go wires the real
// implementation in.
type KeyValidator interface {
	ValidateKey(fingerprint string) (userID string, allowedSubdomain string, plan string, ok bool)
}

// anonymousKeyValidator always reports "unknown key" so every connection
// falls through to the anonymous flow. Used until step 13.
type anonymousKeyValidator struct{}

func (anonymousKeyValidator) ValidateKey(fingerprint string) (string, string, string, bool) {
	return "", "", "", false
}

// buildAuthCallback returns a PublicKeyCallback that accepts every connection.
// Known keys get ssh.Permissions with userID/allowedSubdomain in Extensions.
// Unknown keys get (nil, nil) — accepted as anonymous (Permissions will be nil
// on the ServerConn, which handleConn reads to decide the flow).
func buildAuthCallback(kv KeyValidator) func(ssh.ConnMetadata, ssh.PublicKey) (*ssh.Permissions, error) {
	return func(meta ssh.ConnMetadata, key ssh.PublicKey) (*ssh.Permissions, error) {
		fingerprint := ssh.FingerprintSHA256(key)
		userID, allowedSubdomain, plan, ok := kv.ValidateKey(fingerprint)
		if !ok {
			return nil, nil
		}
		return &ssh.Permissions{
			Extensions: map[string]string{
				"user_id":           userID,
				"allowed_subdomain": allowedSubdomain,
				"plan":              plan,
			},
		}, nil
	}
}
