import { AccessDemo, DomainDemo, InspectorDemo } from "@/components/landing/demos/feature-demos";
import {
  Activity,
  Fingerprint,
  Globe,
  KeyRound,
  ListChecks,
  Lock,
  Server,
  Zap,
} from "lucide-react";

const WORKS_WITH = [
  "Next.js",
  "Vite HMR",
  "Express",
  "FastAPI",
  "Django",
  "Rails",
  "Laravel",
  "Phoenix",
  "Bun",
  "Go net/http",
  "WebSockets",
  "Server-Sent Events",
  "Stripe webhooks",
  "GitHub webhooks",
  "Shopify webhooks",
  "OAuth callbacks",
];

const MORE = [
  {
    icon: Lock,
    title: "Automatic HTTPS",
    body: "Every tunnel gets a domain with a valid certificate, terminated for you.",
  },
  {
    icon: Zap,
    title: "WebSocket and SSE",
    body: "Full HTTP/1.1 upgrades, including Vite and Next.js hot reload.",
  },
  {
    icon: Globe,
    title: "Persistent subdomains",
    body: "Reserve a fixed name such as my-app.tunl.online, tied to your key.",
  },
  {
    icon: ListChecks,
    title: "Subdomain picker",
    body: "Add -t to choose between your reserved names from a menu in the terminal.",
  },
  {
    icon: KeyRound,
    title: "SSH key sign-in",
    body: "Ed25519 or RSA keys. No API tokens and no static passwords.",
  },
  {
    icon: Fingerprint,
    title: "Key revocation",
    body: "Verify fingerprints and cut a key's sessions from the dashboard.",
  },
  {
    icon: Activity,
    title: "Bandwidth analytics",
    body: "Live sessions, transfer volume and history for every tunnel.",
  },
  {
    icon: Server,
    title: "Self-hostable",
    body: "A Go data plane and a TypeScript control plane you can run yourself.",
  },
];

export function Features() {
  return (
    <section className="sec" id="capabilities" aria-labelledby="capabilities-heading">
      <div className="wrap">
        <div className="head">
          <p className="kicker">Capabilities</p>
          <h2 id="capabilities-heading">Everything a tunnel should come with.</h2>
          <p>
            See each request as it arrives, put it on your own domain and decide who gets in. All
            from the same ssh command.
          </p>
        </div>

        <div className="bento">
          <article className="tile tile-insp">
            <p className="tile-copy">
              <b>Inspect every request.</b> Headers, payloads, status and latency, live in the
              browser at <code className="i">/inspect</code>.
            </p>
            <div className="tile-pic tile-pic--bleed">
              <InspectorDemo />
            </div>
          </article>

          <article className="tile tile-stat">
            <p className="tile-copy">
              <b>One port to allow.</b> Outbound TCP to tunl is the only network requirement.
            </p>
            <p className="stat">
              <span className="stat-pre">port</span>
              2222
            </p>
            <ul className="stat-notes">
              <li>Outbound only, no inbound ports</li>
              <li>Works behind NAT and home routers</li>
              <li>The same OpenSSH you use for git</li>
            </ul>
          </article>

          <article className="tile">
            <p className="tile-copy">
              <b>Your own domain.</b> Point a CNAME at tunl, prove it with a TXT record, route it to
              a tunnel.
            </p>
            <div className="tile-pic tile-pic--bleed">
              <DomainDemo />
            </div>
          </article>

          <article className="tile tile-statement">
            <p className="statement">Nothing to install.</p>
            <ul className="skip">
              <li>No CLI binary</li>
              <li>No background daemon</li>
              <li>No auth token for a first tunnel</li>
              <li>No config files</li>
            </ul>
          </article>

          <article className="tile">
            <p className="tile-copy">
              <b>Lock it down.</b> Put a password on a tunnel or allow only the IP ranges you trust.
            </p>
            <div className="tile-pic tile-pic--bleed">
              <AccessDemo />
            </div>
          </article>

          <article className="tile tile-works">
            <p className="tile-copy">
              <b>Works with what you already run.</b> If it speaks HTTP on a local port, it works
              over tunl.
            </p>
            <div className="marquee" aria-label="Frameworks and services">
              <ul className="marquee-track">
                {[...WORKS_WITH, ...WORKS_WITH].map((name, i) => (
                  <li key={`${name}-${i}`} aria-hidden={i >= WORKS_WITH.length || undefined}>
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>

        <ul className="more">
          {MORE.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Icon className="more-icon" aria-hidden="true" />
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ul>

        <p className="soon">
          <b>In development:</b> TCP port forwarding and team workspaces.
        </p>
      </div>
    </section>
  );
}
