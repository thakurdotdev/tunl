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

// buildAuthCallback returns a PublicKeyCallback. On success (a known key)
// the returned ssh.Permissions carries userID/allowedSubdomain in Extensions
// for later steps to read. On failure, the caller should treat the
// connection as anonymous rather than rejecting it outright — this product
// intentionally supports anonymous tunnels.
func buildAuthCallback(kv KeyValidator) func(ssh.ConnMetadata, ssh.PublicKey) (*ssh.Permissions, error) {
	return func(meta ssh.ConnMetadata, key ssh.PublicKey) (*ssh.Permissions, error) {
		fingerprint := ssh.FingerprintSHA256(key)
		userID, allowedSubdomain, plan, ok := kv.ValidateKey(fingerprint)
		if !ok {
			// TODO(step 4): plumb this through so the caller can distinguish
			// "unknown key -> anonymous" from "malformed auth attempt".
			return nil, nil // NOTE: returning (nil, nil) here is a placeholder;
			// x/crypto/ssh actually requires a non-nil error to reject an
			// auth method. Anonymous fallback should be implemented via
			// ssh.ServerConfig.NoClientAuth / AuthLogCallback, not by
			// returning success here. Revisit when building this out.
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
