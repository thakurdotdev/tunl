"use client";

import {
  Badge,
  Bar,
  Code,
  Collapse,
  Roll,
  Stage,
  Toggle,
  Window,
  type Act,
} from "@/components/stageshow/kit";
import "./feature-demos.css";
import { useStageTheme } from "./use-stage-theme";
import { useLayoutEffect, useRef, useState } from "react";

// Measure the tile, not the page: each picture is drawn 1:1 at its slot's width.
function useSlotWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setWidth(Math.max(300, Math.round(node.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

// tunl's feature grid pictures. Each is its own Stage at 1:1, one beat,
// played once as it scrolls in (bento rule 11). The copy is page text.
//
//   Inspector  hero UI    a Stripe webhook lands at the top and is selected
//   Domain     component  the DNS check turns Pending into Verified
//   Access     component  password on, an allowlist range joins the list

/* ---------------- Inspector ---------------- */

type InspS = { arrived: boolean; selected: "hook" | "root" };
const inspInitial: InspS = { arrived: false, selected: "root" };
const inspPoster: InspS = { arrived: true, selected: "hook" };

const ROWS = [
  { id: "assets", method: "GET", path: "/assets/app.js", status: 200, ms: "8ms" },
  { id: "root", method: "GET", path: "/", status: 200, ms: "12ms" },
  { id: "fav", method: "GET", path: "/favicon.ico", status: 404, ms: "3ms" },
  { id: "users", method: "GET", path: "/api/v1/users", status: 200, ms: "9ms" },
  { id: "auth", method: "POST", path: "/auth/callback", status: 302, ms: "15ms" },
];

const PAYLOAD = [
  { text: "{" },
  { text: '  "id": "evt_1Q9xK2",' },
  { text: '  "type": "payment_intent.succeeded",' },
  { text: '  "livemode": false' },
  { text: "}" },
];

async function inspScript(a: Act<InspS>) {
  await a.wait(700);
  await a.set({ arrived: true });
  await a.wait(700);
  await a.set({ selected: "hook" });
}

function ReqRow({
  method,
  path,
  status,
  ms,
  selected,
}: {
  method: string;
  path: string;
  status: number;
  ms: string;
  selected?: boolean;
}) {
  return (
    <div className="tf-req" data-selected={selected || undefined}>
      <span className="tf-method" data-post={method === "POST" || undefined}>
        {method}
      </span>
      <span className="tf-path">{path}</span>
      <span className="tf-status" data-warn={status >= 400 || undefined}>
        {status}
      </span>
      <span className="tf-ms">{ms}</span>
    </div>
  );
}

function Detail({ hook }: { hook: boolean }) {
  return (
    <div className="tf-detail">
      <div className="tf-detail-page" data-show={hook || undefined}>
        <div className="tf-dh">
          <span className="tf-method" data-post>
            POST
          </span>
          <span className="tf-dpath">/api/webhooks/stripe</span>
          <Badge tone="success">200 OK</Badge>
        </div>
        <div className="tf-kv">
          <span>content-type</span>
          <span>application/json</span>
          <span>user-agent</span>
          <span>Stripe/1.0</span>
          <span>stripe-signature</span>
          <span>t=1760361600,v1=5257a8…</span>
        </div>
        <Code lines={PAYLOAD} className="tf-code" numbers={false} />
      </div>
      <div className="tf-detail-page" data-show={!hook || undefined}>
        <div className="tf-dh">
          <span className="tf-method">GET</span>
          <span className="tf-dpath">/</span>
          <Badge tone="success">200 OK</Badge>
        </div>
        <div className="tf-kv">
          <span>accept</span>
          <span>text/html</span>
          <span>user-agent</span>
          <Bar w={120} h={6} tone={2} />
          <span>accept-language</span>
          <Bar w={80} h={6} tone={2} />
        </div>
      </div>
    </div>
  );
}

export function InspectorDemo() {
  const { theme, accent: ACCENT } = useStageTheme();
  const [ref, width] = useSlotWidth(680);
  const compact = width < 600;
  return (
    <div ref={ref} className="tf-slot">
      <Stage<InspS>
        key={compact ? "compact" : "wide"}
        width={width}
        height={compact ? 290 : 320}
        theme={theme}
        greys="cool"
        accent={ACCENT}
        initial={inspInitial}
        poster={inspPoster}
        script={inspScript}
        play="once"
        className={`tf tf-insp${compact ? " tf-compact" : ""}`}
      >
        {(s) => (
          <Window url="tunl.online/inspect/frosty-pine" urlShape="pill" className="tf-insp-win">
            <div className="tf-insp-body">
              <div className="tf-list">
                <div className="tf-list-head">
                  <span className="tf-live">
                    <span className="tf-live-dot" /> Live
                  </span>
                  <span className="tf-count">
                    <Roll>{s.arrived ? "6 requests" : "5 requests"}</Roll>
                  </span>
                </div>
                <Collapse open={s.arrived}>
                  <ReqRow
                    method="POST"
                    path="/api/webhooks/stripe"
                    status={200}
                    ms="34ms"
                    selected={s.selected === "hook"}
                  />
                </Collapse>
                {ROWS.map((r) => (
                  <ReqRow key={r.id} {...r} selected={s.selected === r.id} />
                ))}
              </div>
              {!compact && <Detail hook={s.selected === "hook"} />}
            </div>
          </Window>
        )}
      </Stage>
    </div>
  );
}

/* ---------------- Custom domain ---------------- */

type DomS = { verified: boolean };

async function domScript(a: Act<DomS>) {
  await a.wait(900);
  await a.set({ verified: true });
}

export function DomainDemo() {
  const { theme, accent: ACCENT } = useStageTheme();
  const [ref, width] = useSlotWidth(360);
  return (
    <div ref={ref} className="tf-slot">
      <Stage<DomS>
        width={width}
        height={236}
        theme={theme}
        greys="cool"
        accent={ACCENT}
        initial={{ verified: false }}
        poster={{ verified: true }}
        script={domScript}
        play="once"
        className="tf tf-dom"
      >
        {(s) => (
          <div className="tf-card tf-dom-card">
            <div className="tf-dom-head">
              <span className="tf-dom-name">app.example.com</span>
              <Badge tone={s.verified ? "success" : "warning"} dot>
                <Roll variant="fade">{s.verified ? "Verified" : "Pending"}</Roll>
              </Badge>
            </div>
            <div className="tf-dns">
              <span className="tf-dns-type">CNAME</span>
              <span className="tf-dns-host">app</span>
              <span className="tf-dns-val">tunl.online</span>
            </div>
            <div className="tf-dns">
              <span className="tf-dns-type">TXT</span>
              <span className="tf-dns-host">_tunl</span>
              <span className="tf-dns-val">tunl-verify=8f3a…</span>
            </div>
            <div className="tf-dns tf-dns--route">
              <span className="tf-dns-type">Route</span>
              <span className="tf-dns-val">frosty-pine.tunl.online</span>
            </div>
          </div>
        )}
      </Stage>
    </div>
  );
}

/* ---------------- Access control ---------------- */

type AccS = { password: boolean; added: boolean };

const ALLOW = ["203.0.113.0/24", "10.0.0.0/8", "198.51.100.7"];

async function accScript(a: Act<AccS>) {
  await a.wait(800);
  await a.set({ password: true });
  await a.wait(600);
  await a.set({ added: true });
}

export function AccessDemo() {
  const { theme, accent: ACCENT } = useStageTheme();
  const [ref, width] = useSlotWidth(360);
  return (
    <div ref={ref} className="tf-slot">
      <Stage<AccS>
        width={width}
        height={270}
        theme={theme}
        greys="cool"
        accent={ACCENT}
        initial={{ password: false, added: false }}
        poster={{ password: true, added: true }}
        script={accScript}
        play="once"
        className="tf tf-acc"
      >
        {(s) => (
          <div className="tf-card tf-acc-card">
            <div className="tf-acc-row">
              <span className="tf-acc-label">Password protection</span>
              <Toggle on={s.password} />
            </div>
            <div className="tf-acc-sep" />
            <div className="tf-acc-label">IP allowlist</div>
            <div className="tf-allow">
              {ALLOW.map((cidr, i) => (
                <Collapse key={cidr} open={i < 2 || s.added}>
                  <div className="tf-allow-row">
                    <span className="tf-cidr">{cidr}</span>
                  </div>
                </Collapse>
              ))}
            </div>
            <div className="tf-acc-note">Other addresses get a 403.</div>
          </div>
        )}
      </Stage>
    </div>
  );
}
