"use client";

import {
  Bar,
  Badge,
  Caret,
  Collapse,
  Prompt,
  Stage,
  Text,
  Window,
  type Act,
} from "@/components/stageshow/kit";
import "./hero-demo.css";

import { useStageTheme } from "./use-stage-theme";

// tunl's homepage hero. What the system does, told in its own terminal:
// the ssh command is typed, the tunnel comes online with its public URL,
// the browser opens that URL and the dev's localhost app is there, and each
// request prints back in the terminal. Ctrl+C closes the tunnel (the browser
// leaves with it) and `clear` is the reset the viewer sees.
//
//   Hero       the terminal (dark in both themes), corner bleed, off the bottom
//   Satellite  the browser at the public URL, straddling the terminal's right edge
//   Words      the command, the banner's four values, three request rows, one heading

import { SSH_COMMAND } from "@/components/landing/constants";

export const COMMAND = SSH_COMMAND;

type Req = { method: string; path: string; status: number; ms: string; time: string };
const REQS: Req[] = [
  { time: "12:04:31", method: "GET", path: "/", status: 200, ms: "12ms" },
  { time: "12:04:31", method: "GET", path: "/assets/app.js", status: 200, ms: "8ms" },
  { time: "12:04:36", method: "POST", path: "/api/webhooks/stripe", status: 200, ms: "34ms" },
];

export type HeroState = {
  typed: string;
  online: boolean;
  browser: boolean;
  page: boolean;
  reqs: number;
  closed: boolean;
  clearing: string;
  wipe: "out" | "hidden" | false;
};

export const initial: HeroState = {
  typed: "",
  online: false,
  browser: false,
  page: false,
  reqs: 0,
  closed: false,
  clearing: "",
  wipe: false,
};
export const poster: HeroState = {
  ...initial,
  typed: COMMAND,
  online: true,
  browser: true,
  page: true,
  reqs: 3,
};

export async function script(a: Act<HeroState>) {
  await a.wait(500);
  await a.type("typed", COMMAND, { interval: 38 });
  await a.wait(250);
  await a.key("enter");
  await a.set({ online: true });
  await a.wait(1100);
  // Someone opens the public URL
  await a.set({ browser: true });
  await a.wait(450);
  await a.set({ reqs: 1 });
  await a.wait(220);
  await a.set({ page: true, reqs: 2 });
  await a.wait(1700);
  // A webhook lands on the same tunnel
  await a.set({ reqs: 3 });
  await a.wait(2600);
  // Close the tunnel; the page goes with it
  await a.key("ctrl+c");
  await a.set({ closed: true, browser: false });
  await a.wait(900);
  await a.type("clearing", "clear", { interval: 70 });
  await a.wait(200);
  await a.key("enter");
  // clear: the screen scrolls away, then the fresh prompt fades in at the top
  await a.set({ wipe: "out" });
  await a.wait(420);
  await a.snap({ ...initial, wipe: "hidden" });
  await a.set({ wipe: false });
  await a.wait(300);
}

function Terminal({ s, compact }: { s: HeroState; compact: boolean }) {
  const typing = s.typed.length > 0 && !s.online;
  const path = compact ? "~" : "~/my-app";
  const banner: [string, string, string][] = [
    ["Forwarding", "localhost:3000", "th-local"],
    ["Public URL", "https://frosty-pine.tunl.online", "th-url"],
    ...(compact
      ? []
      : ([["Inspector", "tunl.online/inspect/frosty-pine", "th-link"]] as [
          string,
          string,
          string,
        ][])),
  ];
  return (
    <Window
      chrome="terminal"
      lights="grey"
      title={compact ? undefined : "my-app — ssh"}
      className="th-term"
      body={{ "data-crop": "", className: "th-term__body" }}
    >
      <div className="th-screen" data-wipe={s.wipe || undefined}>
        {/* Scrollback: on a phone the screen is bottom-anchored, as a busy terminal is */}
        {compact && (
          <>
            <Prompt path={path} className="th-old">
              git pull
            </Prompt>
            <div className="th-old">Already up to date.</div>
            <Prompt path={path} className="th-old">
              bun run dev &amp;
            </Prompt>
            <div className="th-old">Ready on http://localhost:3000</div>
          </>
        )}
        {/* The app already answers locally; the tunnel makes it public */}
        <Prompt path={path}>curl -I localhost:3000</Prompt>
        <div className="th-hist">
          HTTP/1.1 <span className="ok">200 OK</span>
        </div>
        <Prompt path={path} className="th-next">
          {s.typed}
          {!s.online && <Caret still={typing} />}
        </Prompt>
        <Collapse open={s.online}>
          <div className="th-head">
            <span className="th-mark">&gt;_</span> <b>tunl</b> <span className="dim">·</span>{" "}
            <span className="ok">● Online</span>
          </div>
        </Collapse>
        {banner.map(([k, v, cls]) => (
          <Collapse key={k} open={s.online}>
            <div className="th-kv">
              <span className="dim">{k}</span>
              <span className={cls}>{v}</span>
            </div>
          </Collapse>
        ))}
        <Collapse open={s.online}>
          <div className="th-rule" />
        </Collapse>
        {REQS.map((r, i) => (
          <Collapse key={r.path} open={s.reqs > i}>
            <div className="th-req">
              {!compact && <span className="dim">{r.time}</span>}
              <span className="th-method" data-post={r.method === "POST" || undefined}>
                {r.method}
              </span>
              <span className="th-path">{r.path}</span>
              <span className="ok">{r.status}</span>
              <span className="dim th-ms">{r.ms}</span>
            </div>
          </Collapse>
        ))}
        <Collapse open={s.closed}>
          <div className="th-closed">
            <span className="dim">^C</span> Tunnel closed
          </div>
        </Collapse>
        <Collapse open={s.closed}>
          <Prompt path={path}>
            {s.clearing}
            <Caret still={s.clearing.length > 0} />
          </Prompt>
        </Collapse>
      </div>
    </Window>
  );
}

function Browser({ s }: { s: HeroState }) {
  return (
    <Window
      url="frosty-pine.tunl.online"
      urlShape="pill"
      className="th-browser"
      data-show={s.browser}
    >
      <div className="th-page" data-loaded={s.page || undefined}>
        <div className="th-nav">
          <Bar w={22} h={22} r={6} tone={4} />
          <Bar w={44} h={6} tone={2} />
          <Bar w={36} h={6} tone={2} />
          <Bar w={40} h={6} tone={2} />
          <span className="th-nav-end">
            <Badge tone="success" dot>
              Dev build
            </Badge>
          </span>
        </div>
        <div className="th-hero">
          <Text className="th-h">Hello from localhost:3000</Text>
          <Bar w={260} h={7} tone={2} />
          <Bar w={190} h={7} tone={2} />
          <div className="th-cta">
            <Bar w={96} h={30} r={8} tone={5} />
            <Bar w={84} h={30} r={8} tone={1} />
          </div>
        </div>
        <div className="th-cards">
          {[0, 1, 2].map((i) => (
            <div key={i} className="th-card">
              <Bar w={[56, 44, 62][i]} h={6} tone={3} />
              <Bar w={[90, 70, 84][i]} h={6} tone={1} />
              <Bar w={[64, 80, 50][i]} h={6} tone={1} />
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
}

export function HeroDemo() {
  const { theme, accent: ACCENT } = useStageTheme();
  return (
    <Stage<HeroState>
      width={1040}
      height={400}
      compact={{ below: 700, width: 358, height: 340 }}
      theme={theme}
      greys="cool"
      accent={ACCENT}
      initial={initial}
      poster={poster}
      script={script}
      keys={{ wide: "bottom-left", compact: "top" }}
      className="th"
    >
      {(s, _rect, layout) => (
        <>
          <Terminal s={s} compact={layout === "compact"} />
          {/* A phone column holds the terminal alone; the request rows carry the payoff */}
          {layout === "wide" && <Browser s={s} />}
        </>
      )}
    </Stage>
  );
}
