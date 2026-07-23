"use client";

import { Button } from "@/components/ui/button";
import { useInspectorSSE, useRecentRequests } from "@/hooks/use-inspector";
import { type CapturedRequest } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Check, Circle, Copy, Pause, Play, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PUT: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PATCH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
  OPTIONS: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  HEAD: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

function statusColor(code: number) {
  if (code < 300) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (code < 400) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  if (code < 500) return "text-orange-400 bg-orange-500/10 border-orange-500/20";
  return "text-red-400 bg-red-500/10 border-red-500/20";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type DetailTab = "general" | "req-headers" | "res-headers" | "req-body" | "res-body";

export default function InspectPage() {
  const params = useParams<{ subdomain: string }>();
  const subdomain = params.subdomain;

  const [paused, setPaused] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("general");

  const { data: initialRequests } = useRecentRequests(subdomain);
  const {
    requests: liveRequests,
    connected,
    clear,
    setRequests,
  } = useInspectorSSE(subdomain, paused);

  useEffect(() => {
    if (!cleared && initialRequests?.length && liveRequests.length === 0) {
      setRequests(initialRequests);
    }
  }, [initialRequests, liveRequests.length, setRequests, cleared]);

  const allRequests = liveRequests;
  const selected = allRequests.find((r) => r.id === selectedId) ?? null;

  const handleClear = () => {
    clear();
    setCleared(true);
    setSelectedId(null);
  };

  return (
    <div className="flex h-[calc(100vh-56px-64px)] flex-col gap-0 font-mono">
      {/* Top Bar */}
      <div className="border-border/60 bg-card/40 flex items-center justify-between border-b px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/inspect">
            <Button variant="ghost" size="icon-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-primary text-sm font-bold">&gt;_</span>
            <h1 className="text-sm font-bold tracking-tight">{subdomain}.thakur.dev</h1>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wider ${
              connected
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                : "bg-muted text-muted-foreground border-border/40"
            }`}
          >
            <Circle className={`h-1.5 w-1.5 fill-current ${connected ? "animate-pulse" : ""}`} />
            {connected ? "LIVE STREAMING" : "OFFLINE"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setPaused(!paused)}
            className="gap-1.5 text-xs font-semibold"
          >
            {paused ? (
              <>
                <Play className="h-3 w-3 text-emerald-400" /> Resume
              </>
            ) : (
              <>
                <Pause className="h-3 w-3 text-amber-400" /> Pause
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={handleClear}
            className="text-muted-foreground hover:text-destructive gap-1.5 text-xs font-semibold"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Request List */}
        <div
          className={`border-border/60 flex flex-col overflow-hidden border-r ${
            selected ? "w-1/2 lg:w-5/12" : "w-full"
          }`}
        >
          {/* List Header */}
          <div className="border-border/60 bg-muted/30 text-muted-foreground flex items-center border-b px-4 py-2.5 text-[10px] font-bold tracking-wider uppercase">
            <span className="w-16">Method</span>
            <span className="flex-1">Path</span>
            <span className="w-14 text-right">Status</span>
            <span className="w-16 text-right">Time</span>
            <span className="w-24 text-right">When</span>
          </div>

          {/* Request Rows */}
          <div className="no-scrollbar flex-1 overflow-y-auto">
            {allRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
                <div className="text-muted-foreground/20 text-5xl font-bold">&gt;_</div>
                <div className="flex flex-col items-center gap-1">
                  <h4 className="text-sm font-semibold">No requests captured</h4>
                  <p className="text-muted-foreground max-w-xs text-xs">
                    {connected
                      ? "Send traffic to https://" +
                        subdomain +
                        ".thakur.dev to see logs in real time"
                      : "Connect your tunnel session to start logging requests"}
                  </p>
                </div>
              </div>
            ) : (
              allRequests.map((req) => (
                <button
                  key={req.id}
                  onClick={() => {
                    setSelectedId(req.id);
                    setActiveTab("general");
                  }}
                  className={`border-border/30 hover:bg-muted/40 flex w-full items-center border-b px-4 py-2.5 text-left text-xs transition-colors ${
                    selectedId === req.id
                      ? "bg-primary/10 border-l-primary border-b-border/30 border-l-2"
                      : ""
                  }`}
                >
                  <span className="w-16">
                    <span
                      className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                        METHOD_COLORS[req.method] ??
                        "bg-muted text-muted-foreground border-border/40"
                      }`}
                    >
                      {req.method}
                    </span>
                  </span>
                  <span className="text-foreground flex-1 truncate font-medium">{req.path}</span>
                  <span className="w-14 text-right">
                    <span
                      className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold ${statusColor(
                        req.statusCode,
                      )}`}
                    >
                      {req.statusCode}
                    </span>
                  </span>
                  <span className="text-muted-foreground w-16 text-right">{req.durationMs}ms</span>
                  <span className="text-muted-foreground w-24 text-right text-[10px]">
                    {formatDistanceToNow(new Date(req.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Footer Stats */}
          <div className="border-border/60 bg-muted/20 text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-[10px]">
            <span>
              {allRequests.length} request{allRequests.length !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5">
              {paused ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Paused
                </>
              ) : connected ? (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
                </>
              ) : (
                <>
                  <span className="bg-muted-foreground/50 h-1.5 w-1.5 rounded-full" /> Offline
                </>
              )}
            </span>
          </div>
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="bg-card/20 flex flex-1 flex-col overflow-hidden">
            {/* Detail Header */}
            <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                    METHOD_COLORS[selected.method] ??
                    "bg-muted text-muted-foreground border-border/40"
                  }`}
                >
                  {selected.method}
                </span>
                <span className="text-foreground max-w-md truncate text-xs font-bold">
                  {selected.path}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${statusColor(
                    selected.statusCode,
                  )}`}
                >
                  {selected.statusCode}
                </span>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={() => setSelectedId(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="border-border/60 flex items-center gap-1 border-b px-3">
              {(
                [
                  ["general", "General"],
                  ["req-headers", "Req Headers"],
                  ["res-headers", "Res Headers"],
                  ["req-body", "Req Body"],
                  ["res-body", "Res Body"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`border-b-2 px-3 py-2 text-[11px] font-medium transition-colors ${
                    activeTab === key
                      ? "text-primary border-primary"
                      : "text-muted-foreground hover:text-foreground border-transparent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="no-scrollbar flex-1 overflow-y-auto p-4">
              {activeTab === "general" && <GeneralTab req={selected} />}
              {activeTab === "req-headers" && <HeadersTable headers={selected.requestHeaders} />}
              {activeTab === "res-headers" && <HeadersTable headers={selected.responseHeaders} />}
              {activeTab === "req-body" && <BodyView body={selected.requestBody} />}
              {activeTab === "res-body" && <BodyView body={selected.responseBody} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GeneralTab({ req }: { req: CapturedRequest }) {
  const rows = [
    ["Method", req.method],
    ["Path", req.path],
    ["Status", String(req.statusCode)],
    ["Duration", `${req.durationMs}ms`],
    ["Client IP", req.clientIP || "127.0.0.1"],
    ["Request Size", formatBytes(req.requestSize)],
    ["Response Size", formatBytes(req.responseSize)],
    [
      "Timestamp",
      new Date(req.timestamp).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "medium",
      }),
    ],
  ];

  return (
    <div className="flex flex-col gap-1">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="border-border/30 bg-card/60 hover:bg-muted/30 flex items-center rounded-lg border px-3 py-2 text-xs"
        >
          <span className="text-muted-foreground w-32 shrink-0 text-[11px] font-bold tracking-wider uppercase">
            {label}
          </span>
          <span className="text-foreground font-mono font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}

function HeadersTable({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers ?? {});
  const [copied, setCopied] = useState(false);

  if (entries.length === 0) {
    return <p className="text-muted-foreground py-12 text-center text-xs">No headers captured</p>;
  }

  const copyHeaders = () => {
    const text = entries.map(([k, v]) => `${k}: ${v}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button variant="outline" size="xs" onClick={copyHeaders} className="gap-1 text-[10px]">
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy Headers
            </>
          )}
        </Button>
      </div>
      <div className="border-border/40 divide-border/40 flex flex-col divide-y overflow-hidden rounded-lg border">
        {entries.map(([key, value]) => (
          <div key={key} className="hover:bg-muted/30 flex items-start px-3 py-2 text-xs">
            <span className="text-primary w-48 shrink-0 font-mono font-semibold break-all">
              {key}
            </span>
            <span className="text-foreground font-mono break-all">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BodyView({ body }: { body?: string }) {
  const [copied, setCopied] = useState(false);

  if (!body) {
    return <p className="text-muted-foreground py-12 text-center text-xs">No body content</p>;
  }

  let formatted = body;
  try {
    const parsed = JSON.parse(body);
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    // raw plain text/html
  }

  const copyBody = () => {
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button variant="outline" size="xs" onClick={copyBody} className="gap-1 text-[10px]">
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" /> Copied Body
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy Body
            </>
          )}
        </Button>
      </div>
      <pre className="border-border/60 bg-muted/40 overflow-auto rounded-lg border p-4 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
        {formatted}
      </pre>
    </div>
  );
}
