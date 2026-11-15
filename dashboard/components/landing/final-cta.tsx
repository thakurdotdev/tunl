import { CopyButton } from "@/components/landing/copy-button";
import { SSH_COMMAND } from "@/components/landing/constants";
import Link from "next/link";

export function FinalCta() {
  return (
    <section className="sec" aria-labelledby="cta-heading">
      <div className="wrap">
        <div className="cta">
          <div className="cta-copy">
            <h2 id="cta-heading">Your first tunnel is one command away.</h2>
            <p>No signup, no download. Paste it, change the port, share the URL.</p>
          </div>
          <div className="cta-term">
            <div className="cmd cmd-dark">
              <span className="cmd-sigil" aria-hidden="true">
                $
              </span>
              <code>{SSH_COMMAND}</code>
              <CopyButton text={SSH_COMMAND} />
            </div>
            <div className="actions">
              <Link className="btn primary" href="/dashboard">
                Open dashboard <span aria-hidden="true">→</span>
              </Link>
              <Link className="btn on-dark" href="/login">
                Add an SSH key
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
