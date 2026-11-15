import { CopyButton } from "@/components/landing/copy-button";
import { SSH_COMMAND } from "@/components/landing/constants";
import { HeroDemo } from "@/components/landing/demos/hero-demo";
import Link from "next/link";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="wrap hero-copy">
        <h1 id="hero-heading">
          Make localhost public with one <span className="h1-mono">ssh</span> command.
        </h1>
        <p className="lead">
          tunl is a reverse tunnel built on the OpenSSH you already have. No binary to download, and
          no account for your first tunnel.
        </p>

        <div className="cmd cmd-hero">
          <span className="cmd-sigil" aria-hidden="true">
            $
          </span>
          <code>{SSH_COMMAND}</code>
          <CopyButton text={SSH_COMMAND} />
        </div>
        <p className="hero-meta">
          Change 3000 to your local port. Works on macOS, Linux and Windows.
        </p>

        <div className="actions">
          <Link className="btn primary" href="/dashboard">
            Open dashboard <span aria-hidden="true">→</span>
          </Link>
          <Link className="text-link" href="/login">
            Reserve a subdomain
          </Link>
        </div>
      </div>

      <div className="hero-stage">
        <HeroDemo />
      </div>

      <div className="wrap">
        <ul className="facts" aria-label="Highlights">
          <li>
            <b>Nothing to install</b>
            <span>OpenSSH on macOS, Linux and Windows</span>
          </li>
          <li>
            <b>HTTPS by default</b>
            <span>A valid certificate on every tunnel</span>
          </li>
          <li>
            <b>WebSockets and HMR</b>
            <span>Upgrades, SSE and hot reload pass through</span>
          </li>
          <li>
            <b>Free while in preview</b>
            <span>Reserved names included</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
