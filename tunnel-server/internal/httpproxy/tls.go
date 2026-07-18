// tls.go: load a single wildcard cert/key pair from disk for *.<BaseDomain>.
// ACME automation is explicitly out of scope for now (plan section 1.4).
package httpproxy

import "crypto/tls"

func LoadWildcardCert(certPath, keyPath string) (tls.Certificate, error) {
	return tls.LoadX509KeyPair(certPath, keyPath)
}
