// conn_adapter.go wraps an io.ReadWriteCloser (what registry.TunnelConnection.Dial
// returns) as a net.Conn so it can be handed to http.Transport.DialContext,
// which expects net.Conn. Only the methods ReverseProxy actually needs are
// meaningfully implemented; the rest are best-effort no-ops.
package httpproxy

import (
	"io"
	"net"
	"time"
)

type rwcConn struct {
	io.ReadWriteCloser
}

func wrapAsConn(rwc io.ReadWriteCloser) net.Conn {
	return &rwcConn{rwc}
}

func (c *rwcConn) LocalAddr() net.Addr                { return dummyAddr{} }
func (c *rwcConn) RemoteAddr() net.Addr               { return dummyAddr{} }
func (c *rwcConn) SetDeadline(t time.Time) error      { return nil }
func (c *rwcConn) SetReadDeadline(t time.Time) error  { return nil }
func (c *rwcConn) SetWriteDeadline(t time.Time) error { return nil }

type dummyAddr struct{}

func (dummyAddr) Network() string { return "tunnel" }
func (dummyAddr) String() string  { return "tunnel-connection" }
