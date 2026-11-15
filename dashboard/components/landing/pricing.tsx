import Link from "next/link";

export function Pricing() {
  return (
    <section className="sec" id="pricing" aria-labelledby="pricing-heading">
      <div className="wrap">
        <div className="head head-center">
          <p className="kicker">Pricing</p>
          <h2 id="pricing-heading">Free to start. Free to reserve a name.</h2>
          <p>
            Tunnel straight away without an account. Register an SSH key when you want a subdomain
            that stays yours.
          </p>
        </div>
        <div className="plans">
          <div className="plan">
            <div className="plan-top">
              <h3>Ephemeral</h3>
              <p className="tag">Free forever</p>
            </div>
            <p className="amt">
              $0<span>/month</span>
            </p>
            <p className="plan-lead">
              One-command tunnels for quick debugging, testing and webhook inspection.
            </p>
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
          <div className="plan plan-hl">
            <div className="plan-top">
              <h3>Reserved</h3>
              <p className="tag tag-accent">Developer preview</p>
            </div>
            <p className="amt">
              $0<span>/during preview</span>
            </p>
            <p className="plan-lead">
              Persistent names and your own domains, linked to your OpenSSH public key.
            </p>
            <ul>
              <li>Everything in Ephemeral</li>
              <li>
                Persistent subdomains, <code className="i">name.tunl.online</code>
              </li>
              <li>Custom domains with DNS verification</li>
              <li>Password protection and IP allowlists</li>
              <li>Request inspector and web dashboard</li>
            </ul>
            <Link className="btn primary" href="/login">
              Claim a subdomain <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
