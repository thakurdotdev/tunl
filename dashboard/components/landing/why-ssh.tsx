export function WhySsh() {
  return (
    <section className="sec">
      <div className="wrap zero-grid">
        <div className="head">
          <h2>Nothing to install.</h2>
          <p>
            Most tunneling tools ask you to add a custom agent. tunl uses the OpenSSH client already
            on your machine.
          </p>
        </div>
        <div className="lists">
          <div className="no">
            <h3>What you skip</h3>
            <ul>
              <li>A CLI binary to download</li>
              <li>A background daemon process</li>
              <li>API tokens for basic tunneling</li>
              <li>Local configuration files</li>
              <li>Custom package manager updates</li>
            </ul>
          </div>
          <div className="yes">
            <h3>What you already have</h3>
            <ul>
              <li>OpenSSH on macOS, Linux and Windows 10 and 11</li>
              <li>Ed25519 and RSA key authentication</li>
              <li>An encrypted SSH transport</li>
              <li>Standard port forwarding syntax</li>
              <li>Outbound access to TCP port 2222, the only network requirement</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
