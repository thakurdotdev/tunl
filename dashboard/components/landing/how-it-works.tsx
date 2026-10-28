"use client";

import { useEffect, useRef } from "react";

export function HowItWorks() {
  const flowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = flowRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        el.classList.toggle("in", entries[0]?.isIntersecting ?? false);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="sec band" id="how" aria-labelledby="how-heading">
      <div className="wrap">
        <div className="head">
          <h2 id="how-heading">Standard SSH port forwarding, with HTTPS at the other end.</h2>
          <p>
            Your local server connects to tunl over SSH. Public HTTPS traffic travels back down the
            same connection.
          </p>
        </div>
        <div className="flow" id="flow" ref={flowRef}>
          <div className="node">
            <h3>
              <span className="num">1</span>Local machine
            </h3>
            <code>localhost:3000</code>
            <p>Any HTTP server on any local TCP port: Next.js, FastAPI, Express or Django.</p>
          </div>
          <div className="link a" aria-hidden="true">
            <span className="lab">ssh -R</span>
            <span className="ln">
              <i className="dot" />
            </span>
          </div>
          <div className="node">
            <h3>
              <span className="num">2</span>SSH transport
            </h3>
            <code>tunl.online:2222</code>
            <p>
              A standard OpenSSH reverse forward, encrypted end to end with Ed25519 key pairs.
            </p>
          </div>
          <div className="link b" aria-hidden="true">
            <span className="lab">HTTPS</span>
            <span className="ln">
              <i className="dot" />
            </span>
          </div>
          <div className="node">
            <h3>
              <span className="num">3</span>Public endpoint
            </h3>
            <code>https://my-app.tunl.online</code>
            <p>A public HTTPS URL with a valid certificate, for webhooks, teammates and phones.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
