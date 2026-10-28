import { SSH_COMMAND } from "@/components/landing/constants";

export function UseCases() {
  return (
    <section className="sec band" id="uses" aria-labelledby="uses-heading">
      <div className="wrap">
        <div className="head">
          <h2 id="uses-heading">For when a local server has to be reachable.</h2>
        </div>
        <div className="bento">
          <article className="tile big">
            <div>
              <h3>Test webhooks without deploying</h3>
              <p>
                Receive Stripe, GitHub or Shopify callbacks on localhost while you build the
                integration. Paste your tunnel URL into the provider&apos;s dashboard and watch each
                delivery arrive in the inspector.
              </p>
            </div>
            <div className="snip">
              <p>
                <span className="tg">$</span> {SSH_COMMAND}
              </p>
              <p className="td">Webhook endpoint:</p>
              <p className="tl">https://my-app.tunl.online/api/webhooks/stripe</p>
            </div>
          </article>
          <article className="tile">
            <h3>Share work in progress</h3>
            <p>Send teammates or clients a live HTTPS link straight from your local build.</p>
          </article>
          <article className="tile">
            <h3>Test on real phones</h3>
            <p>Point physical devices at the API server running on your workstation.</p>
          </article>
          <article className="tile">
            <h3>Build OAuth sign-in locally</h3>
            <p>Register a tunl HTTPS address as the redirect URI while you develop.</p>
          </article>
          <article className="tile">
            <h3>Demo without a cloud server</h3>
            <p>Show prototypes and live UI state without standing up a temporary deployment.</p>
          </article>
          <article className="tile">
            <h3>Reach your laptop from IoT hardware</h3>
            <p>Send webhooks and HTTP requests from embedded devices to localhost.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
