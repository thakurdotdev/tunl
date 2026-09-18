"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const SSH_COMMAND = "ssh -R 80:localhost:3000 -p 2222 tunl.online";

const FLOW_REQUESTS = [
  { time: "14:07:39", method: "GET", path: "/", status: "200 OK", latency: "291ms" },
  {
    time: "14:07:40",
    method: "POST",
    path: "/api/webhooks/stripe",
    status: "200 OK",
    latency: "34ms",
  },
  { time: "14:07:41", method: "GET", path: "/api/v1/users", status: "200 OK", latency: "12ms" },
];

export function HeroFlow() {
  const [copied, setCopied] = useState(false);
  const [flowStage, setFlowStage] = useState(0);
  const [visibleRequests, setVisibleRequests] = useState(0);

  const handleCopy = () => {
    navigator.clipboard.writeText(SSH_COMMAND);
    setCopied(true);
    toast.success("Command copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // Staggered sequential flow animation on mount
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => setFlowStage(1), 50));
    timers.push(setTimeout(() => setFlowStage(2), 250));
    timers.push(setTimeout(() => setFlowStage(3), 500));
    timers.push(setTimeout(() => setFlowStage(4), 750));
    timers.push(setTimeout(() => setFlowStage(5), 1000));
    timers.push(setTimeout(() => setFlowStage(6), 1250));

    timers.push(setTimeout(() => setVisibleRequests(1), 1450));
    timers.push(setTimeout(() => setVisibleRequests(2), 1750));
    timers.push(setTimeout(() => setVisibleRequests(3), 2050));

    // Failsafe for background tab throttling
    timers.push(
      setTimeout(() => {
        setFlowStage(6);
        setVisibleRequests(3);
      }, 2500),
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="w-full">
      {/* SSH Command Box */}
      <div className="group relative mb-8 w-full">
        <button
          type="button"
          onClick={handleCopy}
          className="bg-card border-border/60 hover:border-border group relative flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors sm:px-5 sm:py-4"
        >
          <div className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto font-mono text-xs select-all sm:text-sm md:text-base">
            <span className="text-muted-foreground select-none">$</span>
            <code className="text-foreground font-semibold whitespace-nowrap">{SSH_COMMAND}</code>
          </div>
          <span className="bg-muted/60 border-border/60 text-muted-foreground group-hover:text-foreground flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors">
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-mono text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </span>
        </button>
      </div>

      {/* Flow Diagram (Animated left-to-right / top-to-bottom) */}
      <div className="mb-6 w-full">
        <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:justify-between sm:gap-0">
          {/* Localhost */}
          <div
            className={`flex flex-col items-center gap-0.5 transition-all duration-500 ${
              flowStage >= 1 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              Your machine
            </span>
            <code className="text-foreground font-mono text-xs font-semibold">localhost:3000</code>
          </div>

          {/* SSH Arrow (Desktop) */}
          <div
            className={`text-muted-foreground/80 hidden items-center transition-all duration-500 sm:flex ${
              flowStage >= 2 ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"
            }`}
          >
            <div className="border-border/80 w-6 border-t border-dashed md:w-10" />
            <span className="text-muted-foreground bg-background px-1.5 font-mono text-[10px] font-semibold tracking-wider uppercase">
              SSH
            </span>
            <div className="border-border/80 w-6 border-t border-dashed md:w-10" />
            <svg width="6" height="10" viewBox="0 0 6 10" className="text-muted-foreground">
              <path
                d="M1 1L5 5L1 9"
                stroke="currentColor"
                strokeWidth="1.25"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Mobile SSH Divider */}
          <div
            className={`text-muted-foreground/80 flex flex-col items-center transition-all duration-500 sm:hidden ${
              flowStage >= 2 ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            }`}
          >
            <div className="border-border/80 h-2.5 border-l border-dashed" />
            <span className="text-muted-foreground font-mono text-[9px] font-semibold tracking-wider uppercase">
              SSH
            </span>
            <div className="border-border/80 h-2.5 border-l border-dashed" />
          </div>

          {/* tunl node */}
          <div
            className={`flex flex-col items-center gap-0.5 transition-all duration-500 ${
              flowStage >= 3 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              tunl control plane
            </span>
            <span className="text-muted-foreground font-mono text-xs">
              port <span className="text-foreground font-semibold">2222</span>
            </span>
          </div>

          {/* HTTPS Arrow (Desktop) */}
          <div
            className={`text-muted-foreground/80 hidden items-center transition-all duration-500 sm:flex ${
              flowStage >= 4 ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"
            }`}
          >
            <div className="border-border/80 w-6 border-t border-dashed md:w-10" />
            <span className="text-muted-foreground bg-background px-1.5 font-mono text-[10px] font-semibold tracking-wider uppercase">
              HTTPS
            </span>
            <div className="border-border/80 w-6 border-t border-dashed md:w-10" />
            <svg width="6" height="10" viewBox="0 0 6 10" className="text-muted-foreground">
              <path
                d="M1 1L5 5L1 9"
                stroke="currentColor"
                strokeWidth="1.25"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Mobile HTTPS Divider */}
          <div
            className={`text-muted-foreground/80 flex flex-col items-center transition-all duration-500 sm:hidden ${
              flowStage >= 4 ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            }`}
          >
            <div className="border-border/80 h-2.5 border-l border-dashed" />
            <span className="text-muted-foreground font-mono text-[9px] font-semibold tracking-wider uppercase">
              HTTPS
            </span>
            <div className="border-border/80 h-2.5 border-l border-dashed" />
          </div>

          {/* Public URL */}
          <div
            className={`flex flex-col items-center gap-0.5 transition-all duration-500 ${
              flowStage >= 5 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              Public Internet
            </span>
            <code className="text-primary font-mono text-xs font-semibold">my-app.tunl.online</code>
          </div>
        </div>

        {/* Request Telemetry Stream */}
        <div
          className={`border-border/60 mt-5 border-t pt-4 transition-all duration-500 ${
            flowStage >= 6 ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="mx-auto flex max-w-md flex-col gap-1 font-mono text-[11px]">
            {FLOW_REQUESTS.map((req, i) => (
              <div
                key={i}
                className={`text-muted-foreground flex items-center justify-between transition-all duration-400 ${
                  i < visibleRequests ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-muted-foreground/80 xs:inline hidden text-[10px]">
                    {req.time}
                  </span>
                  <span className="text-foreground font-medium">{req.method}</span>
                  <span className="text-muted-foreground truncate">{req.path}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold text-emerald-400">{req.status}</span>
                  <span className="text-muted-foreground/80 text-[10px]">{req.latency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
