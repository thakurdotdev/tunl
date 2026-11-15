const STEPS = [
  {
    n: "01",
    title: "Run your app",
    body: "Any HTTP server on any local port: Next.js, Vite, FastAPI, Express, Rails or Django.",
    code: "localhost:3000",
  },
  {
    n: "02",
    title: "Open the tunnel",
    body: "A standard OpenSSH reverse forward to tunl, encrypted end to end. Nothing else to run.",
    code: "ssh -R 80:localhost:3000 …",
  },
  {
    n: "03",
    title: "Share the URL",
    body: "Public HTTPS traffic comes back down the same connection to your machine.",
    code: "https://frosty-pine.tunl.online",
  },
];

export function HowItWorks() {
  return (
    <section className="sec" id="how" aria-labelledby="how-heading">
      <div className="wrap">
        <div className="head">
          <p className="kicker">How it works</p>
          <h2 id="how-heading">Standard SSH port forwarding, with HTTPS at the other end.</h2>
        </div>
        <ol className="steps">
          {STEPS.map((step) => (
            <li key={step.n} className="step">
              <span className="step-n">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <code className="step-code">{step.code}</code>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
