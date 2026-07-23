"use client";

import { useEffect, useState } from "react";

interface LogEntry {
  text: string;
  type: "prompt" | "system" | "success" | "traffic";
}

const FULL_COMMAND = "ssh -R 80:localhost:3000 -p 2222 my-app@t.thakur.dev";

const INITIAL_LOGS: LogEntry[] = [
  { text: "[sys] Connecting to t.thakur.dev:2222...", type: "system" },
  { text: "[auth] Authenticated with key (ed25519:a8...3f)", type: "system" },
  { text: "[tunnel] Remote port forwarding initialized", type: "system" },
  { text: "▶ Tunnel Live: https://my-app.thakur.dev -> http://localhost:3000", type: "success" },
];

const STREAMING_TRAFFIC = [
  "200 OK  GET  /  (12ms)",
  "200 OK  GET  /_next/static/chunks/app.js  (4ms)",
  "200 OK  POST /api/webhooks/stripe  (34ms)",
  "200 OK  GET  /api/v1/user/profile  (8ms)",
  "101 UPGR GET  /api/ws (WebSocket connected)",
  "200 OK  POST /api/webhooks/github  (22ms)",
];

export function TerminalDemo() {
  const [typedCommand, setTypedCommand] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [visibleLogs, setVisibleLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    let charIndex = 0;
    const typingInterval = setInterval(() => {
      charIndex++;
      if (charIndex <= FULL_COMMAND.length) {
        setTypedCommand(FULL_COMMAND.slice(0, charIndex));
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
      }
    }, 40);

    return () => clearInterval(typingInterval);
  }, []);

  useEffect(() => {
    if (isTyping) return;

    let index = 0;
    const logInterval = setInterval(() => {
      if (index < INITIAL_LOGS.length) {
        const nextLog = INITIAL_LOGS[index];
        if (nextLog) {
          setVisibleLogs((prev) => [...prev, nextLog]);
        }
        index++;
      } else {
        clearInterval(logInterval);
      }
    }, 350);

    return () => clearInterval(logInterval);
  }, [isTyping]);

  useEffect(() => {
    if (visibleLogs.length < INITIAL_LOGS.length) return;

    let trafficCounter = 0;
    const trafficInterval = setInterval(() => {
      const logText = STREAMING_TRAFFIC[trafficCounter % STREAMING_TRAFFIC.length];
      trafficCounter++;
      setVisibleLogs((prev) => {
        const updated: LogEntry[] = [...prev, { text: logText, type: "traffic" }];
        return updated.slice(-8);
      });
    }, 2000);

    return () => clearInterval(trafficInterval);
  }, [visibleLogs.length]);

  return (
    <div className="border-border bg-card/90 overflow-hidden rounded-lg border font-mono shadow-2xl backdrop-blur-md">
      <div className="border-border bg-muted/60 flex items-center justify-between border-b px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground ml-2 font-mono text-[11px]">
            bash — tunl-ssh-session
          </span>
        </div>
        <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
          LIVE DEMO
        </span>
      </div>

      <div className="flex min-h-[260px] flex-col justify-start gap-2 p-4 font-mono text-xs select-none">
        <div className="text-foreground flex items-center gap-2">
          <span className="text-primary font-bold">$</span>
          <span className="text-foreground">{typedCommand}</span>
          <span
            className={`bg-primary inline-block h-4 w-2 ${
              isTyping ? "animate-pulse" : "animate-terminal-blink"
            }`}
          />
        </div>

        {visibleLogs.map((log, idx) => {
          if (!log) return null;
          if (log.type === "system") {
            return (
              <div key={idx} className="text-muted-foreground text-[11px]">
                {log.text}
              </div>
            );
          }
          if (log.type === "success") {
            return (
              <div key={idx} className="py-1 text-[12px] font-bold text-emerald-400">
                {log.text}
              </div>
            );
          }
          return (
            <div key={idx} className="flex items-center gap-2 text-[11px] text-cyan-400/90">
              <span className="text-emerald-500/70">▶</span>
              <span>{log.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
