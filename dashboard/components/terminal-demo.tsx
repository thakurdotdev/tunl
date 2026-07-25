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
        return updated.slice(-3);
      });
    }, 2000);

    return () => clearInterval(trafficInterval);
  }, [visibleLogs.length]);

  return (
    <div className="border-zinc-800 bg-zinc-950 overflow-hidden rounded-lg border shadow-xl text-zinc-100 font-sans">
      <div className="border-zinc-800/80 bg-zinc-900/80 flex items-center justify-between border-b px-4 py-2.5 text-xs font-sans">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="text-zinc-400 ml-2 font-sans text-xs font-medium">
            Terminal — ssh tunl
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Session</span>
        </div>
      </div>

      <div className="flex min-h-[260px] flex-col justify-start gap-2.5 p-5 font-mono text-xs select-none bg-zinc-950">
        <div className="text-zinc-100 flex items-center gap-2">
          <span className="text-emerald-400 font-semibold">$</span>
          <span className="text-zinc-100">{typedCommand}</span>
          <span
            className={`bg-emerald-400 inline-block h-4 w-2 ${
              isTyping ? "animate-pulse" : "animate-terminal-blink"
            }`}
          />
        </div>

        {visibleLogs.map((log, idx) => {
          if (!log) return null;
          if (log.type === "system") {
            return (
              <div key={idx} className="text-zinc-400 text-[11px]">
                {log.text}
              </div>
            );
          }
          if (log.type === "success") {
            return (
              <div key={idx} className="py-1 text-xs font-semibold text-emerald-400">
                {log.text}
              </div>
            );
          }
          return (
            <div key={idx} className="flex items-center gap-2 text-[11px] text-zinc-300">
              <span className="text-emerald-400">▶</span>
              <span>{log.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
