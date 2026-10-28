"use client";

import { SSH_COMMAND } from "@/components/landing/constants";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import "./hero-terminal.css";

type LogEntry = [string, string, number, string, number, number];

const SEQ: LogEntry[] = [
  ["GET", "/", 200, "OK", 47, 47],
  ["GET", "/favicon.ico", 404, "Not Found", 31, 31],
  ["POST", "/api/webhooks/stripe", 200, "OK", 34, 34],
  ["GET", "/api/v1/users", 200, "OK", 12, 12],
];

const POOL: LogEntry[] = [
  ["GET", "/", 200, "OK", 30, 70],
  ["GET", "/", 304, "Not Modified", 25, 60],
  ["POST", "/api/webhooks/stripe", 200, "OK", 20, 60],
  ["POST", "/api/webhooks/github", 200, "OK", 25, 60],
  ["GET", "/api/v1/users", 200, "OK", 8, 30],
  ["GET", "/api/v1/users/42", 200, "OK", 8, 30],
  ["POST", "/api/v1/orders", 201, "Created", 40, 120],
  ["GET", "/favicon.ico", 404, "Not Found", 20, 80],
  ["POST", "/auth/callback", 302, "Found", 15, 50],
];

const STATIC_LOGS = [
  { time: "13:39:32", method: "GET", path: "/", status: "200 OK", tone: "tg", ms: "47ms" },
  {
    time: "13:39:34",
    method: "GET",
    path: "/favicon.ico",
    status: "404 Not Found",
    tone: "ty",
    ms: "31ms",
  },
  {
    time: "13:39:41",
    method: "POST",
    path: "/api/webhooks/stripe",
    status: "200 OK",
    tone: "tg",
    ms: "34ms",
  },
  {
    time: "13:39:47",
    method: "GET",
    path: "/api/v1/users",
    status: "200 OK",
    tone: "tg",
    ms: "12ms",
  },
  {
    time: "13:39:52",
    method: "GET",
    path: "/",
    status: "304 Not Modified",
    tone: "tc",
    ms: "45ms",
  },
  {
    time: "13:40:03",
    method: "POST",
    path: "/api/webhooks/github",
    status: "200 OK",
    tone: "tg",
    ms: "41ms",
  },
];

const MAX = 7;

function pad(x: number) {
  return (x < 10 ? "0" : "") + x;
}

function stamp() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function tone(c: number) {
  return c < 300 ? "tg" : c < 400 ? "tc" : c < 500 ? "ty" : "tr";
}

interface LogRow {
  id: number;
  time: string;
  method: string;
  path: string;
  status: string;
  tone: string;
  ms: string;
  animate: boolean;
}

export function HeroTerminal({
  showCaption = true,
  compact = false,
  className,
}: {
  showCaption?: boolean;
  compact?: boolean;
  className?: string;
} = {}) {
  const termRef = useRef<HTMLDivElement>(null);
  const [animOk, setAnimOk] = useState(false);
  const [typed, setTyped] = useState(SSH_COMMAND);
  const [showHdr, setShowHdr] = useState(true);
  const [logs, setLogs] = useState<LogRow[]>(() =>
    STATIC_LOGS.map((l, i) => ({ ...l, id: i, animate: false })),
  );

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;
    setAnimOk(true);
    setTyped("");
    setShowHdr(false);
    setLogs([]);
  }, []);

  useEffect(() => {
    if (!animOk || !termRef.current) return;

    let n = 0;
    let last: LogEntry | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let visible = false;
    let started = false;
    let cancelled = false;
    let rowId = 0;

    const next = (): LogEntry => {
      if (n < SEQ.length) return SEQ[n++];
      let e: LogEntry;
      do {
        e = POOL[Math.floor(Math.random() * POOL.length)];
      } while (e === last);
      last = e;
      n++;
      return e;
    };

    const addLine = (e: LogEntry) => {
      const ms = e[4] + Math.round(Math.random() * (e[5] - e[4]));
      const row: LogRow = {
        id: ++rowId,
        time: stamp(),
        method: e[0],
        path: e[1],
        status: `${e[2]} ${e[3]}`,
        tone: tone(e[2]),
        ms: `${ms}ms`,
        animate: true,
      };
      setLogs((prev) => {
        const nextLogs = [...prev, row];
        return nextLogs.length > MAX ? nextLogs.slice(nextLogs.length - MAX) : nextLogs;
      });
    };

    const tick = () => {
      timer = null;
      if (cancelled || !visible || document.hidden) return;
      addLine(next());
      timer = setTimeout(tick, n <= SEQ.length ? 650 : 1300 + Math.random() * 1700);
    };

    const resume = () => {
      if (started && !timer && visible && !document.hidden && !cancelled) {
        timer = setTimeout(tick, 500);
      }
    };

    const play = () => {
      let i = 0;
      const step = () => {
        if (cancelled) return;
        i++;
        setTyped(SSH_COMMAND.slice(0, i));
        if (i < SSH_COMMAND.length) {
          setTimeout(step, 26);
        } else {
          setTimeout(() => {
            if (cancelled) return;
            setShowHdr(true);
            timer = setTimeout(tick, 600);
          }, 260);
        }
      };
      step();
    };

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? false;
        if (visible && !started) {
          started = true;
          play();
        } else if (visible) {
          resume();
        }
      },
      { threshold: 0.3 },
    );

    io.observe(termRef.current);
    document.addEventListener("visibilitychange", resume);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      io.disconnect();
      document.removeEventListener("visibilitychange", resume);
    };
  }, [animOk]);

  return (
    <div className={cn("tunl-terminal", animOk && "anim", compact && "compact", className)}>
      <div
        ref={termRef}
        className={cn("term", showHdr && "hdr")}
        role="img"
        aria-label="Terminal showing a running tunnel with its public URL, inspector link and a live request log"
      >
        <p>
          <span className="tg">$</span> <span>{typed}</span>
          <span className="cur caret" />
        </p>
        <div className="pre">
          <p className="hd">
            <span className="tg">&gt;_</span> <b>tunl</b>
            <span className="cur" />
            <span className="td">•</span>
            &nbsp;&nbsp;
            <span className="tg">● Online</span>
          </p>
          <hr />
          <dl className="kv">
            <dt>Account</dt>
            <dd className="tx">SHA256:k3Fq…x9A (free plan)</dd>
            <dt>Forwarding</dt>
            <dd>
              <span className="ty">localhost:3000</span> <span className="td">(via ssh -R)</span>
            </dd>
            <dt>Public URL</dt>
            <dd className="tl">https://my-app.tunl.online</dd>
            <dt>Inspector</dt>
            <dd className="tl">https://tunl.online/inspect/my-app</dd>
          </dl>
          <hr />
          <p className="td">
            Press <span className="tx">Ctrl+C</span> or <span className="tx">Ctrl+D</span> to stop
            the tunnel
          </p>
        </div>
        <div className="lgs">
          {logs.map((l) => (
            <div key={l.id} className={cn("lg", l.animate && "new")}>
              <span className="td">{l.time}</span>
              <span className="tg">{l.method}</span>
              <span className="tx p">{l.path}</span>
              <span className={l.tone}>{l.status}</span>
              <span className="ms">{l.ms}</span>
            </div>
          ))}
        </div>
      </div>
      {showCaption ? (
        <p className="caption">The request log as it prints in your terminal.</p>
      ) : null}
    </div>
  );
}
