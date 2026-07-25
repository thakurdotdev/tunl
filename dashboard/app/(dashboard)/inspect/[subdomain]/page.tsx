"use client";

import { Button } from "@/components/ui/button";
import { useInspectorSSE, useRecentRequests } from "@/hooks/use-inspector";
import { type CapturedRequest } from "@/lib/types";
import {
  ArrowLeft,
  Check,
  Circle,
  Code2,
  Copy,
  Filter,
  Pause,
  Play,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

function generateCurlCommand(req: CapturedRequest, subdomain: string): string {
  const host = `${subdomain}.tunl.online`;
  const url = `https://${host}${req.path}`;
  let cmd = `curl -X ${req.method} "${url}"`;

  if (req.requestHeaders) {
    for (const [key, val] of Object.entries(req.requestHeaders)) {
      if (key?.toLowerCase() === "host") continue;
      cmd += ` \\\n  -H "${key}: ${(val ?? "").replace(/"/g, '\\"')}"`;
    }
  }

  if (req.requestBody) {
    cmd += ` \\\n  --data '${req.requestBody.replace(/'/g, "'\\''")}'`;
  }

  return cmd;
}

function formatShortRelativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type DetailTab = "general" | "req-headers" | "res-headers" | "req-body" | "res-body" | "curl";
type MethodFilter = "ALL" | "GET" | "POST" | "ERRORS";

export default function InspectPage() {
  const params = useParams<{ subdomain: string }>();
  const subdomain = params.subdomain;

  const [paused, setPaused] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("ALL");

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

  const filteredRequests = useMemo(() => {
    return liveRequests.filter((r) => {
      if (methodFilter === "GET" && r.method !== "GET") return false;
      if (methodFilter === "POST" && r.method !== "POST") return false;
      if (methodFilter === "ERRORS" && r.statusCode < 400) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pathMatch = r.path ? r.path.toLowerCase().includes(q) : false;
        const methodMatch = r.method ? r.method.toLowerCase().includes(q) : false;
        const statusMatch =
          r.statusCode !== undefined && r.statusCode !== null
            ? String(r.statusCode).includes(q)
            : false;
        return pathMatch || methodMatch || statusMatch;
      }
      return true;
    });
  }, [liveRequests, methodFilter, searchQuery]);

  const selected = liveRequests.find((r) => r.id === selectedId) ?? null;

  const handleClear = () => {
    clear();
    setCleared(true);
    setSelectedId(null);
  };

  return (
    <div className="flex h-[calc(100vh-56px-64px)] flex-col gap-0 font-sans">
      {/* Top Bar */}
      <div className="border-border/60 bg-card flex flex-wrap items-center justify-between gap-2.5 border-b px-3 py-2.5 sm:px-4 sm:py-3">
        {/* Left Section: Subdomain & Status */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link href="/inspect">
            <Button variant="ghost" size="icon-xs" className="h-7 w-7">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <div className="flex min-w-0 items-center gap-1.5 font-mono">
            <span className="text-primary text-xs font-semibold">&gt;_</span>
            <h1 className="text-foreground max-w-[160px] truncate text-xs font-bold tracking-tight sm:max-w-none sm:text-sm">
              {subdomain}.tunl.online
            </h1>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
              connected
                ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-400"
                : "bg-muted text-muted-foreground border-border/60"
            }`}
          >
            <Circle className={`h-1.5 w-1.5 fill-current ${connected ? "animate-pulse" : ""}`} />
            {connected ? "Live" : "Offline"}
          </span>
        </div>

        {/* Right Section: Controls */}
        <div className="flex items-center gap-1.5 font-sans sm:gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setPaused(!paused)}
            className="gap-1 px-2.5 text-xs font-medium"
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
            className="text-muted-foreground hover:text-destructive gap-1 px-2.5 text-xs font-medium"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 font-sans text-xs">
        {/* Method Filter Pills */}
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
          <Filter className="text-muted-foreground mr-1 h-3.5 w-3.5 shrink-0" />
          {(["ALL", "GET", "POST", "ERRORS"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setMethodFilter(filter)}
              className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                methodFilter === filter
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:w-64 sm:flex-none">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search path, method, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border/60 bg-background placeholder:text-muted-foreground/60 focus:ring-primary w-full rounded-md border py-1 pr-3 pl-8 text-xs focus:ring-1 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex flex-1 overflow-hidden font-sans">
        {/* Request List Column */}
        <div
          className={`border-border/60 flex w-full flex-col overflow-hidden ${
            selected ? "hidden border-r md:flex md:w-1/2 lg:w-5/12" : "flex w-full"
          }`}
        >
          {/* Table Header */}
          <div className="border-border/60 bg-muted/40 text-muted-foreground flex items-center border-b px-3 py-2 text-[10px] font-semibold tracking-wider uppercase">
            <span className="w-14 shrink-0 sm:w-16">Method</span>
            <span className="flex-1 truncate">Path</span>
            <span className="w-12 shrink-0 text-right sm:w-14">Status</span>
            <span className="w-16 shrink-0 text-right sm:w-20">Time</span>
            <span className="w-20 shrink-0 text-right sm:w-24">When</span>
          </div>

          {/* Request Rows */}
          <div className="no-scrollbar divide-border/40 flex-1 divide-y overflow-y-auto">
            {filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
                <div className="text-muted-foreground/30 font-mono text-3xl">&gt;_</div>
                <div className="flex flex-col items-center gap-1">
                  <h4 className="text-xs font-semibold sm:text-sm">
                    {searchQuery || methodFilter !== "ALL"
                      ? "No matching requests"
                      : "No requests captured"}
                  </h4>
                  <p className="text-muted-foreground max-w-xs text-xs">
                    {searchQuery || methodFilter !== "ALL"
                      ? "Try adjusting your search query or filter settings"
                      : connected
                        ? "Send traffic to https://" +
                          subdomain +
                          ".tunl.online to see logs in real time"
                        : "Connect your tunnel session to start logging requests"}
                  </p>
                </div>
              </div>
            ) : (
              filteredRequests.map((req) => (
                <button
                  key={req.id}
                  onClick={() => {
                    setSelectedId(req.id);
                    setActiveTab("general");
                  }}
                  className={`hover:bg-muted/30 flex w-full items-center px-3 py-2 text-left text-xs transition-colors ${
                    selectedId === req.id ? "bg-muted/50 font-semibold" : ""
                  }`}
                >
                  <span className="w-14 shrink-0 font-mono sm:w-16">
                    <span
                      className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                        METHOD_COLORS[req.method] ??
                        "bg-muted text-muted-foreground border-border/60"
                      }`}
                    >
                      {req.method}
                    </span>
                  </span>
                  <span className="text-foreground flex-1 truncate pr-2 font-mono text-xs font-medium">
                    {req.path}
                  </span>
                  <span className="w-12 shrink-0 text-right font-mono sm:w-14">
                    <span
                      className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold ${statusColor(
                        req.statusCode,
                      )}`}
                    >
                      {req.statusCode}
                    </span>
                  </span>
                  <span className="text-muted-foreground w-16 shrink-0 text-right font-mono text-[11px] sm:w-20">
                    {req.durationMs}ms
                  </span>
                  <span className="text-muted-foreground w-20 shrink-0 text-right font-sans text-[11px] whitespace-nowrap sm:w-24">
                    {formatShortRelativeTime(req.timestamp)}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* List Footer Stats */}
          <div className="border-border/60 bg-muted/20 text-muted-foreground flex items-center justify-between border-t px-3 py-2 text-[11px]">
            <span>
              {filteredRequests.length} / {liveRequests.length} request
              {liveRequests.length !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
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

        {/* Detail Inspector Panel */}
        {selected && (
          <div className="bg-card flex w-full flex-1 flex-col overflow-hidden">
            {/* Detail Header & Mobile Back Button */}
            <div className="border-border/60 bg-muted/40 flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setSelectedId(null)}
                  className="mr-1 shrink-0 gap-1 text-xs md:hidden"
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </Button>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    METHOD_COLORS[selected.method] ??
                    "bg-muted text-muted-foreground border-border/60"
                  }`}
                >
                  {selected.method}
                </span>
                <span className="text-foreground truncate font-mono text-xs font-semibold">
                  {selected.path}
                </span>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${statusColor(
                    selected.statusCode,
                  )}`}
                >
                  {selected.statusCode}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setSelectedId(null)}
                className="hidden shrink-0 md:flex"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Scrollable Tab Navigation */}
            <div className="border-border/60 no-scrollbar flex items-center gap-1 overflow-x-auto border-b px-3">
              {(
                [
                  ["general", "General"],
                  ["req-headers", "Req Headers"],
                  ["res-headers", "Res Headers"],
                  ["req-body", "Req Body"],
                  ["res-body", "Res Body"],
                  ["curl", "cURL"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`shrink-0 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === key
                      ? "text-primary border-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground border-transparent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Body Viewers */}
            <div className="no-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
              {activeTab === "general" && <GeneralTab req={selected} />}
              {activeTab === "req-headers" && (
                <HeadersTable headers={selected.requestHeaders} title="Request Headers" />
              )}
              {activeTab === "res-headers" && (
                <HeadersTable headers={selected.responseHeaders} title="Response Headers" />
              )}
              {activeTab === "req-body" && (
                <BodyView body={selected.requestBody} title="Request Body" />
              )}
              {activeTab === "res-body" && (
                <BodyView body={selected.responseBody} title="Response Body" />
              )}
              {activeTab === "curl" && <CurlTab req={selected} subdomain={subdomain} />}
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
      new Date(req.timestamp).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "medium",
      }),
    ],
  ];

  return (
    <div className="flex flex-col gap-2 font-sans">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="border-border/60 bg-muted/20 hover:bg-muted/30 flex flex-wrap items-center justify-between rounded-md border px-3 py-2 text-xs"
        >
          <span className="text-muted-foreground w-28 shrink-0 text-xs font-medium">{label}</span>
          <span className="text-foreground font-mono text-xs font-semibold break-all">{value}</span>
        </div>
      ))}
    </div>
  );
}

function HeadersTable({ headers, title }: { headers: Record<string, string>; title: string }) {
  const entries = Object.entries(headers ?? {});
  const [copied, setCopied] = useState(false);

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center font-sans text-xs">
        No {title.toLowerCase()} captured
      </p>
    );
  }

  const copyHeaders = () => {
    const text = entries.map(([k, v]) => `${k}: ${v}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3 font-sans">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {title} ({entries.length})
        </span>
        <Button variant="outline" size="xs" onClick={copyHeaders} className="gap-1 text-xs">
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
      <div className="border-border/60 divide-border/60 flex flex-col divide-y overflow-hidden rounded-md border">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="hover:bg-muted/20 flex flex-col gap-1 px-3 py-2 text-xs sm:flex-row sm:items-start sm:gap-0"
          >
            <span className="w-44 shrink-0 font-mono font-semibold break-all text-emerald-400">
              {key}
            </span>
            <span className="text-foreground flex-1 font-mono break-all">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BodyView({ body, title }: { body?: string; title: string }) {
  const [copied, setCopied] = useState(false);

  if (!body) {
    return (
      <p className="text-muted-foreground py-12 text-center font-sans text-xs">
        No {title.toLowerCase()} content
      </p>
    );
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
    <div className="flex flex-col gap-3 font-sans">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {title}
        </span>
        <Button variant="outline" size="xs" onClick={copyBody} className="gap-1 text-xs">
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy Body
            </>
          )}
        </Button>
      </div>
      <pre className="border-border/60 bg-muted/40 text-foreground max-h-[500px] overflow-auto rounded-md border p-3.5 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
        {formatted}
      </pre>
    </div>
  );
}

function CurlTab({ req, subdomain }: { req: CapturedRequest; subdomain: string }) {
  const [copied, setCopied] = useState(false);
  const curlCmd = useMemo(() => generateCurlCommand(req, subdomain), [req, subdomain]);

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3 font-sans">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
          <Code2 className="text-primary h-3.5 w-3.5" /> cURL Command
        </span>
        <Button variant="outline" size="xs" onClick={copyCurl} className="gap-1 text-xs">
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy cURL
            </>
          )}
        </Button>
      </div>
      <pre className="border-border/60 bg-muted/40 overflow-auto rounded-md border p-3.5 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-emerald-400">
        {curlCmd}
      </pre>
    </div>
  );
}
