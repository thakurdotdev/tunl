import { CopyButton } from "@/components/landing/copy-button";
import { SSH_COMMAND } from "@/components/landing/constants";
import { HeroTerminal } from "@/components/landing/hero-terminal";
import Link from "next/link";

export function Hero() {
  return (
    <div className="hero">
      <div className="wrap hero-grid">
        <div>
          <h1>Make localhost public with one ssh command.</h1>
          <p className="lead">
            tunl is a reverse tunnel built on the OpenSSH you already have. There is no binary to
            download, and basic tunnels need no account.
          </p>

          <div className="cmd">
            <span className="tg" aria-hidden="true">
              $
            </span>
            <code>{SSH_COMMAND}</code>
            <CopyButton text={SSH_COMMAND} />
          </div>
          <p className="hero-meta">
            Works with the OpenSSH on macOS, Linux, and Windows 10 and 11. Change 3000 to your local
            port.
          </p>

          <div className="actions">
            <Link className="btn primary hero-primary" href="/dashboard">
              Open dashboard <span aria-hidden="true">→</span>
            </Link>
            <Link className="btn hero-secondary" href="/login">
              Add SSH key
            </Link>
          </div>
        </div>

        <HeroTerminal />
      </div>
    </div>
  );
}
