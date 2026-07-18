package sshserver

// Wire-format structs for the forwarded-tcpip channel open message,
// matching RFC 4254 §7.2. x/crypto/ssh.Marshal/Unmarshal use these
// field tags to produce the correct byte layout on the wire.

// channelOpenForwardMsg is sent by the server to the client to open a
// forwarded-tcpip channel. The client's SSH library matches (ConnectedAddr,
// ConnectedPort) against the bind address/port it originally requested via
// tcpip-forward, then routes data to the corresponding local listener.
type channelOpenForwardMsg struct {
	ConnectedAddr string
	ConnectedPort uint32
	OriginAddr    string
	OriginPort    uint32
}

// tcpipForwardRequest is the payload of the "tcpip-forward" global request
// sent by the client (ssh -R). We parse this to learn what bind address and
// port the client wants forwarded.
type tcpipForwardRequest struct {
	BindAddr string
	BindPort uint32
}

// tcpipForwardReply is our reply payload when the client requested bind
// port 0 (meaning "pick one for me"). We echo back the port we assigned.
type tcpipForwardReply struct {
	BoundPort uint32
}
