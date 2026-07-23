"use client";

import { Button } from "@/components/ui/button";
import { useInspectorSSE, useRecentRequests } from "@/hooks/use-inspector";
import { type CapturedRequest } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Circle, Pause, Play, Trash2, X } from "lucide-react";
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
  if (code < 300) return "text-emerald-400";
  if (code < 400) return "text-amber-400";
  if (code < 500) return "text-orange-400";
  return "text-red-400";
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
    if (initialRequests?.length && liveRequests.length === 0) {
      setRequests(initialRequests);
    }
  }, [initialRequests, liveRequests.length, setRequests]);

  const allRequests = liveRequests;
  const selected = allRequests.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100vh-56px-64px)] flex-col gap-0 font-mono">
      {/* Top Bar */}
      <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-primary text-sm font-bold">&gt;_</span>
            <h1 className="text-sm font-bold tracking-tight">{subdomain}.thakur.dev</h1>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              connected
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                : "bg-muted text-muted-foreground border-border/40"
            }`}
          >
            <Circle className={`h-1.5 w-1.5 fill-current ${connected ? "animate-pulse" : ""}`} />
            {connected ? "STREAMING" : "DISCONNECTED"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setPaused(!paused)}
            className="gap-1.5 text-xs"
          >
            {paused ? (
              <>
                <Play className="h-3 w-3" /> Resume
              </>
            ) : (
              <>
                <Pause className="h-3 w-3" /> Pause
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              clear();
              setSelectedId(null);
            }}
            className="gap-1.5 text-xs"
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
            selected ? "w-1/2 lg:w-2/5" : "w-full"
          }`}
        >
          {/* List Header */}
          <div className="border-border/60 bg-muted/30 flex items-center border-b px-4 py-2 text-[10px] font-semibold tracking-wider uppercase">
            <span className="text-muted-foreground w-16">Method</span>
            <span className="text-muted-foreground flex-1">Path</span>
            <span className="text-muted-foreground w-14 text-right">Status</span>
            <span className="text-muted-foreground w-16 text-right">Time</span>
            <span className="text-muted-foreground w-20 text-right">When</span>
          </div>

          {/* Request Rows */}
          <div className="no-scrollbar flex-1 overflow-y-auto">
            {allRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <div className="text-muted-foreground/30 text-4xl">⚡</div>
                <p className="text-muted-foreground text-xs">
                  {connected ? "Waiting for requests..." : "Connect a tunnel to start inspecting"}
                </p>
              </div>
            ) : (
              allRequests.map((req) => (
                <button
                  key={req.id}
                  onClick={() => {
                    setSelectedId(req.id);
                    setActiveTab("general");
                  }}
                  className={`border-border/30 hover:bg-muted/30 flex w-full items-center border-b px-4 py-2.5 text-left text-xs transition-colors ${
                    selectedId === req.id ? "bg-primary/5 border-primary/20" : ""
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
                  <span className={`w-14 text-right font-bold ${statusColor(req.statusCode)}`}>
                    {req.statusCode}
                  </span>
                  <span className="text-muted-foreground w-16 text-right">{req.durationMs}ms</span>
                  <span className="text-muted-foreground w-20 text-right text-[10px]">
                    {formatDistanceToNow(new Date(req.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Footer Stats */}
          <div className="border-border/60 bg-muted/20 flex items-center justify-between border-t px-4 py-1.5 text-[10px]">
            <span className="text-muted-foreground">
              {allRequests.length} request{allRequests.length !== 1 ? "s" : ""}
            </span>
            <span className="text-muted-foreground">
              {paused ? "⏸ Paused" : connected ? "● Live" : "○ Offline"}
            </span>
          </div>
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Detail Header */}
            <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-4 py-2">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                    METHOD_COLORS[selected.method] ??
                    "bg-muted text-muted-foreground border-border/40"
                  }`}
                >
                  {selected.method}
                </span>
                <span className="text-foreground max-w-md truncate text-xs font-medium">
                  {selected.path}
                </span>
                <span className={`text-xs font-bold ${statusColor(selected.statusCode)}`}>
                  {selected.statusCode}
                </span>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={() => setSelectedId(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="border-border/60 flex items-center gap-0.5 border-b px-3">
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
    ["Client IP", req.clientIP],
    ["Request Size", formatBytes(req.requestSize)],
    ["Response Size", formatBytes(req.responseSize)],
    [
      "Timestamp",
      new Date(req.timestamp).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "long",
      }),
    ],
  ];

  return (
    <div className="flex flex-col gap-0.5">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="hover:bg-muted/30 flex items-center rounded px-2 py-1.5 text-xs"
        >
          <span className="text-muted-foreground w-32 shrink-0 text-[11px] font-semibold uppercase">
            {label}
          </span>
          <span className="text-foreground font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}

function HeadersTable({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers);

  if (entries.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-xs">No headers captured</p>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {entries.map(([key, value]) => (
        <div key={key} className="hover:bg-muted/30 flex items-start rounded px-2 py-1.5 text-xs">
          <span className="text-primary w-48 shrink-0 font-semibold break-all">{key}</span>
          <span className="text-foreground break-all">{value}</span>
        </div>
      ))}
    </div>
  );
}

function BodyView({ body }: { body?: string }) {
  if (!body) {
    return <p className="text-muted-foreground py-8 text-center text-xs">No body captured</p>;
  }

  let formatted = body;
  try {
    const parsed = JSON.parse(body);
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    // not JSON, show raw
  }

  return (
    <pre className="bg-muted/40 border-border/60 overflow-auto rounded-lg border p-4 text-xs leading-relaxed break-all whitespace-pre-wrap">
      {formatted}
    </pre>
  );
}
