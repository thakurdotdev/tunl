import Link from "next/link";

export function Pricing() {
  return (
    <section className="sec" id="pricing" aria-labelledby="pricing-heading">
      <div className="wrap">
        <div className="head">
          <h2 id="pricing-heading">Free to start. Free to reserve a name.</h2>
          <p>
            Tunnel straight away without an account. Register an SSH key when you want a subdomain
            that stays yours.
          </p>
        </div>
        <div className="plans">
          <div className="plan">
            <h3>Ephemeral</h3>
            <p className="tag">Free forever</p>
            <div className="amt">
              $0<span> / month</span>
            </div>
            <p>One-command tunnels for quick debugging, testing and webhook inspection.</p>
            <ul>
              <li>Random subdomain per SSH connection</li>
              <li>Automatic HTTPS and TLS termination</li>
              <li>WebSocket and SSE protocol upgrades</li>
              <li>No account or registration required</li>
            </ul>
            <Link className="btn" href="/dashboard">
              Open dashboard
            </Link>
          </div>
          <div className="plan hl">
            <h3>Reserved</h3>
            <p className="tag">Developer preview</p>
            <div className="amt">
              $0<span> / preview access</span>
            </div>
            <p>A persistent subdomain linked to your registered OpenSSH public key.</p>
            <ul>
              <li>Everything in Ephemeral</li>
              <li>
                Persistent static subdomain, <code className="i">name.tunl.online</code>
              </li>
              <li>OpenSSH Ed25519 key authentication</li>
              <li>Traffic inspector and web dashboard</li>
            </ul>
            <Link className="btn primary" href="/login">
              Claim reserved subdomain
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
