import { Cable, Laptop, MonitorSmartphone, Presentation, ShieldCheck, Webhook } from "lucide-react";

const CASES = [
  {
    icon: Webhook,
    title: "Test webhooks without deploying",
    body: "Point Stripe, GitHub or Shopify at your tunnel URL and watch each delivery arrive in the inspector.",
  },
  {
    icon: Laptop,
    title: "Share work in progress",
    body: "Send teammates or clients a live HTTPS link straight from your local build.",
  },
  {
    icon: MonitorSmartphone,
    title: "Test on real phones",
    body: "Point physical devices at the API or site running on your workstation.",
  },
  {
    icon: ShieldCheck,
    title: "Build OAuth sign-in locally",
    body: "Register a tunl HTTPS address as the redirect URI while you develop.",
  },
  {
    icon: Presentation,
    title: "Demo without a server",
    body: "Show a prototype and its live state without standing up a temporary deployment.",
  },
  {
    icon: Cable,
    title: "Reach your laptop from hardware",
    body: "Let embedded and IoT devices send requests to a server on localhost.",
  },
];

export function UseCases() {
  return (
    <section className="sec sec-tint" id="uses" aria-labelledby="uses-heading">
      <div className="wrap">
        <div className="head">
          <p className="kicker">Use cases</p>
          <h2 id="uses-heading">For when a local server has to be reachable.</h2>
        </div>
        <ul className="cases">
          {CASES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="case">
              <span className="case-icon" aria-hidden="true">
                <Icon />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
