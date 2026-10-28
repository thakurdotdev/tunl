export function Features() {
  return (
    <section className="sec" id="capabilities" aria-labelledby="capabilities-heading">
      <div className="wrap">
        <div className="head">
          <h2 id="capabilities-heading">What every tunnel includes.</h2>
          <p>
            See each request as it arrives, in your terminal and in the web inspector, with the
            headers, payloads and status codes.
          </p>
        </div>

        <figure
          className="insp"
          role="img"
          aria-label="The request inspector: a list of requests on the left and the headers and JSON payload of a Stripe webhook on the right"
        >
          <div className="insp-bar">
            <span className="dots">
              <i />
              <i />
              <i />
            </span>
            <span>tunl.online/inspect/my-app</span>
          </div>
          <div className="insp-body">
            <ul className="reqs">
              <li>
                <b>GET</b>
                <span>/</span>
                <em>200</em>
                <small>47ms</small>
              </li>
              <li>
                <b>GET</b>
                <span>/favicon.ico</span>
                <em className="w">404</em>
                <small>31ms</small>
              </li>
              <li className="sel">
                <b>POST</b>
                <span>/api/webhooks/stripe</span>
                <em>200</em>
                <small>34ms</small>
              </li>
              <li>
                <b>GET</b>
                <span>/api/v1/users</span>
                <em>200</em>
                <small>12ms</small>
              </li>
              <li>
                <b>POST</b>
                <span>/api/webhooks/github</span>
                <em>200</em>
                <small>41ms</small>
              </li>
            </ul>
            <div className="detail">
              <div className="dh">
                <b>POST</b>
                <span>/api/webhooks/stripe</span>
                <em>200 OK</em>
                <small>34ms</small>
              </div>
              <div className="tabs">
                <span className="on">Request</span>
                <span>Response</span>
              </div>
              <dl className="hdrs">
                <dt>content-type</dt>
                <dd>application/json</dd>
                <dt>user-agent</dt>
                <dd>Stripe/1.0 (+https://stripe.com/docs/webhooks)</dd>
                <dt>stripe-signature</dt>
                <dd>t=1760361600,v1=5257a8…</dd>
              </dl>
              <pre>{`{
  "id": "evt_1Q9xK2",
  "type": "payment_intent.succeeded",
  "livemode": false
}`}</pre>
            </div>
          </div>
          <figcaption className="insp-cap">
            The inspector shows headers, payloads, status codes and latency for every request.
          </figcaption>
        </figure>

        <div className="group">
          <p className="glabel">Tunnel infrastructure</p>
          <div className="cols4">
            <div className="item">
              <h3>Automatic HTTPS and TLS</h3>
              <p>Every tunnel gets an HTTPS domain with a valid certificate, terminated for you.</p>
            </div>
            <div className="item">
              <h3>WebSocket and SSE upgrades</h3>
              <p>
                Full HTTP/1.1 upgrades for WebSockets, Server-Sent Events and Vite or Next.js hot
                reloading.
              </p>
            </div>
            <div className="item">
              <h3>Request inspection</h3>
              <p>
                Read incoming headers, payloads, methods and status codes in real time from the
                dashboard.
              </p>
            </div>
            <div className="item">
              <h3>Persistent subdomains</h3>
              <p>
                Reserve a fixed name such as <code className="i">my-app.tunl.online</code>, linked
                to your SSH key.
              </p>
            </div>
          </div>
        </div>

        <div className="group">
          <p className="glabel">Security and access control</p>
          <div className="cols4">
            <div className="item">
              <h3>OpenSSH key authentication</h3>
              <p>Sign in with an Ed25519 or RSA key. No API tokens and no static passwords.</p>
            </div>
            <div className="item">
              <h3>IP allowlisting</h3>
              <p>
                Limit who can reach a tunnel with CIDR blocks or client IP ranges set in your
                dashboard.
              </p>
            </div>
            <div className="item">
              <h3>Scoped forwarding</h3>
              <p>Only the port you choose is forwarded. No local files or network are exposed.</p>
            </div>
            <div className="item">
              <h3>Key revocation</h3>
              <p>
                Register keys, verify fingerprints and revoke access instantly from the web console.
              </p>
            </div>
          </div>
        </div>

        <p className="soon">
          <b>In development:</b> custom domains (.yourdomain.com), TCP port forwarding and team
          workspaces.
        </p>
      </div>
    </section>
  );
}
