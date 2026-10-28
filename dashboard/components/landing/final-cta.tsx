import { CopyButton } from "@/components/landing/copy-button";
import { SSH_COMMAND } from "@/components/landing/constants";
import Link from "next/link";

export function FinalCta() {
  return (
    <section className="sec">
      <div className="wrap">
        <div className="box">
          <div>
            <h2>Start your first tunnel.</h2>
            <p>No signup required. Run standard SSH and get an HTTPS endpoint.</p>
          </div>
          <div>
            <div className="cmd">
              <span className="tg" aria-hidden="true">
                $
              </span>
              <code>{SSH_COMMAND}</code>
              <CopyButton text={SSH_COMMAND} />
            </div>
            <div className="actions">
              <Link className="btn" href="/dashboard">
                Open dashboard
              </Link>
              <Link className="btn" href="/login">
                Add SSH key
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
