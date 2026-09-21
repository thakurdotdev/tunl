"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAudit } from "@/hooks/use-admin";
import type { TunnelEventItem } from "@/lib/types";
import { toast } from "sonner";
import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  ExternalLink,
  Globe,
  Info,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Terminal,
  X,
} from "lucide-react";

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

export default function AdminAuditPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<
    "all" | "tunnel.connected" | "tunnel.disconnected"
  >("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLiveStream, setIsLiveStream] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TunnelEventItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data: auditData,
    isLoading,
    isFetching,
    refetch,
  } = useAdminAudit(
    {
      page,
      pageSize,
      search: debouncedSearch,
      eventType: eventTypeFilter,
    },
    {
      refetchInterval: isLiveStream ? 5000 : false,
    },
  );

  const events = auditData?.items ?? [];
  const pagination = auditData?.pagination;
  const total = pagination?.total ?? 0;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const currentPage = Math.min(page, totalPages);

  const handleCopy = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleFilterChange = (filter: "all" | "tunnel.connected" | "tunnel.disconnected") => {
    setEventTypeFilter(filter);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setEventTypeFilter("all");
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchInput || eventTypeFilter !== "all");

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header & Live Stream Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-foreground text-base font-bold">Audit Event Stream</h2>
          <p className="text-muted-foreground text-xs">
            Real-time connection telemetry, disconnections, and authenticated session events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Polling Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !isLiveStream;
              setIsLiveStream(next);
              if (next) toast.info("Live stream enabled (polling every 5s)");
              else toast.info("Live stream paused");
            }}
            className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all ${
              isLiveStream
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-xs"
                : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isLiveStream ? "animate-pulse bg-emerald-400" : "bg-zinc-500"
              }`}
            />
            <span>{isLiveStream ? "Live Polling On" : "Live Stream Paused"}</span>
            {isLiveStream ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </button>

          {/* Manual Refresh */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-border/60 h-8 gap-1.5 px-3 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "text-primary animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Audit Trail Container */}
      <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-xl border shadow-2xs">
        {/* Controls: Search, Filter Tabs & Page Size */}
        <div className="border-border/60 bg-muted/20 flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="text-muted-foreground absolute top-2.5 left-3 h-3.5 w-3.5" />
            <Input
              type="text"
              placeholder="Search subdomain, email, or IP address..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-background/80 border-border/60 focus-visible:ring-primary/40 h-8.5 pr-8 pl-9 font-mono text-xs"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="text-muted-foreground hover:text-foreground absolute top-2.5 right-2.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Tabs */}
            <div className="border-border/50 bg-muted/40 flex items-center gap-1 rounded-lg border p-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => handleFilterChange("all")}
                className={`rounded-md px-3 py-1 font-medium transition-all ${
                  eventTypeFilter === "all"
                    ? "bg-card text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Events
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange("tunnel.connected")}
                className={`rounded-md px-3 py-1 font-medium transition-all ${
                  eventTypeFilter === "tunnel.connected"
                    ? "bg-card font-semibold text-emerald-400 shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Connected
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange("tunnel.disconnected")}
                className={`rounded-md px-3 py-1 font-medium transition-all ${
                  eventTypeFilter === "tunnel.disconnected"
                    ? "bg-card font-semibold text-rose-400 shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Disconnected
              </button>
            </div>

            {/* Page Size Selector */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="border-border/60 bg-background text-foreground focus:ring-primary/40 h-8.5 rounded-lg border px-2.5 font-mono text-xs"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="border-border/60 bg-muted/30 text-muted-foreground border-b text-[10px] font-semibold tracking-wider uppercase">
              <tr>
                <th className="p-3.5">Event Type</th>
                <th className="p-3.5">Subdomain Endpoint</th>
                <th className="p-3.5">User Account</th>
                <th className="p-3.5">Remote Client IP</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5 text-right">Age</th>
                <th className="p-3.5 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-border/30 divide-y">
              {isLoading ? (
                // Skeletons
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="p-3.5">
                      <div className="bg-muted h-5 w-28 rounded-full" />
                    </td>
                    <td className="p-3.5">
                      <div className="bg-muted h-4 w-36 rounded" />
                    </td>
                    <td className="p-3.5">
                      <div className="bg-muted h-4 w-32 rounded" />
                    </td>
                    <td className="p-3.5">
                      <div className="bg-muted h-4 w-24 rounded" />
                    </td>
                    <td className="p-3.5">
                      <div className="bg-muted h-4 w-28 rounded" />
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="bg-muted ml-auto h-4 w-12 rounded" />
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="bg-muted mx-auto h-6 w-6 rounded" />
                    </td>
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="text-muted-foreground flex flex-col items-center justify-center gap-2">
                      <Activity className="text-muted-foreground/40 mb-1 h-8 w-8" />
                      <span className="text-foreground text-xs font-semibold">
                        No audit events match current criteria
                      </span>
                      <p className="text-muted-foreground text-xs">
                        {hasActiveFilters
                          ? "Try adjusting search terms or clearing event filters."
                          : "New tunnel connection and disconnect events will appear here."}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleClearFilters}
                          className="mt-2 text-xs"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                events.map((evt) => {
                  const isConnected = evt.eventType === "tunnel.connected";
                  return (
                    <tr
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      className="hover:bg-muted/30 group cursor-pointer transition-colors"
                    >
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                            isConnected
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isConnected ? "animate-pulse bg-emerald-400" : "bg-rose-400"
                            }`}
                          />
                          {isConnected ? "tunnel.connected" : "tunnel.disconnected"}
                        </span>
                      </td>

                      <td className="p-3.5">
                        {evt.subdomain ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 font-bold text-cyan-400">
                              <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" />
                              {evt.subdomain}.tunl.online
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(
                                  `${evt.subdomain}.tunl.online`,
                                  "subdomain",
                                  `sub-${evt.id}`,
                                );
                              }}
                              className="text-muted-foreground/60 hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                              title="Copy subdomain"
                            >
                              {copiedKey === `sub-${evt.id}` ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </td>

                      <td className="text-muted-foreground p-3.5">
                        {evt.userEmail ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-foreground font-medium">{evt.userEmail}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(evt.userEmail!, "email", `email-${evt.id}`);
                              }}
                              className="text-muted-foreground/60 hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                              title="Copy email"
                            >
                              {copiedKey === `email-${evt.id}` ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : evt.anonymousId ? (
                          <span className="text-muted-foreground/70 text-[11px] italic">
                            Anon: {evt.anonymousId.slice(0, 10)}...
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 italic">Anonymous device</span>
                        )}
                      </td>

                      <td className="text-muted-foreground p-3.5 font-mono">
                        {evt.remoteIp ? (
                          <div className="flex items-center gap-1.5">
                            <span>{evt.remoteIp}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(evt.remoteIp!, "IP address", `ip-${evt.id}`);
                              }}
                              className="text-muted-foreground/60 hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                              title="Copy IP"
                            >
                              {copiedKey === `ip-${evt.id}` ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </td>

                      <td className="text-muted-foreground p-3.5 whitespace-nowrap">
                        {new Date(evt.occurredAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>

                      <td className="text-muted-foreground p-3.5 text-right whitespace-nowrap">
                        {formatShortRelativeTime(evt.occurredAt)}
                      </td>

                      <td className="p-3.5 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(evt);
                          }}
                          className="text-muted-foreground hover:text-foreground h-6 w-6"
                          title="Inspect Event"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="border-border/60 bg-muted/10 flex flex-col gap-3 border-t p-4 font-mono text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground text-xs">
            {total > 0 ? (
              <>
                Showing{" "}
                <span className="text-foreground font-semibold">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                –{" "}
                <span className="text-foreground font-semibold">
                  {Math.min(currentPage * pageSize, total)}
                </span>{" "}
                of <span className="text-foreground font-semibold">{total.toLocaleString()}</span>{" "}
                events
                {isFetching && (
                  <span className="text-primary ml-2 inline-flex items-center gap-1 text-[11px]">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Updating...
                  </span>
                )}
              </>
            ) : (
              <span>0 events found</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {/* First Page */}
            <Button
              size="icon"
              variant="outline"
              onClick={() => setPage(1)}
              disabled={currentPage <= 1 || isLoading}
              className="border-border/60 h-8 w-8"
              title="First Page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>

            {/* Prev Page */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="border-border/60 h-8 px-2.5 font-mono text-xs"
            >
              <ChevronLeft className="mr-0.5 h-3.5 w-3.5" /> Prev
            </Button>

            <span className="text-muted-foreground px-2 font-medium">
              {currentPage} / {totalPages}
            </span>

            {/* Next Page */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="border-border/60 h-8 px-2.5 font-mono text-xs"
            >
              Next <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Button>

            {/* Last Page */}
            <Button
              size="icon"
              variant="outline"
              onClick={() => setPage(totalPages)}
              disabled={currentPage >= totalPages || isLoading}
              className="border-border/60 h-8 w-8"
              title="Last Page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Event Details Inspection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="bg-card border-border/80 flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border shadow-2xl">
            {/* Modal Header */}
            <div className="border-border/60 bg-muted/20 flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <Terminal className="text-primary h-4 w-4" />
                <h3 className="text-foreground text-sm font-bold">Event Telemetry Inspector</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-muted-foreground hover:text-foreground rounded-md p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 overflow-y-auto p-5 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="border-border/60 bg-muted/20 rounded-lg border p-3">
                  <span className="text-muted-foreground block text-[10px] uppercase">
                    Event Type
                  </span>
                  <span
                    className={`mt-1 inline-block font-semibold ${
                      selectedEvent.eventType === "tunnel.connected"
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {selectedEvent.eventType}
                  </span>
                </div>

                <div className="border-border/60 bg-muted/20 rounded-lg border p-3">
                  <span className="text-muted-foreground block text-[10px] uppercase">
                    Subdomain
                  </span>
                  <span className="mt-1 block font-bold text-cyan-400">
                    {selectedEvent.subdomain ? `${selectedEvent.subdomain}.tunl.online` : "N/A"}
                  </span>
                </div>

                <div className="border-border/60 bg-muted/20 rounded-lg border p-3">
                  <span className="text-muted-foreground block text-[10px] uppercase">
                    User Account
                  </span>
                  <span className="text-foreground mt-1 block truncate font-medium">
                    {selectedEvent.userEmail || "Anonymous device"}
                  </span>
                </div>

                <div className="border-border/60 bg-muted/20 rounded-lg border p-3">
                  <span className="text-muted-foreground block text-[10px] uppercase">
                    Remote Client IP
                  </span>
                  <span className="text-foreground mt-1 block font-medium">
                    {selectedEvent.remoteIp || "N/A"}
                  </span>
                </div>
              </div>

              <div className="border-border/60 bg-muted/20 space-y-1.5 rounded-lg border p-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-[10px] uppercase">Event ID</span>
                  <span className="text-foreground select-all">
                    {selectedEvent.eventId || selectedEvent.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-[10px] uppercase">Timestamp</span>
                  <span className="text-foreground">
                    {new Date(selectedEvent.occurredAt).toISOString()}
                  </span>
                </div>
              </div>

              {/* Raw Properties JSON */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px] font-semibold">
                    Raw Payload Properties
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleCopy(
                        JSON.stringify(selectedEvent.properties ?? {}, null, 2),
                        "JSON payload",
                        "raw-json",
                      )
                    }
                    className="h-6 px-2 text-[10px]"
                  >
                    <Copy className="mr-1 h-3 w-3" /> Copy JSON
                  </Button>
                </div>
                <pre className="border-border/60 bg-background/80 text-foreground max-h-48 overflow-auto rounded-lg border p-3 font-mono text-[11px] select-all">
                  {JSON.stringify(selectedEvent.properties ?? {}, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-border/60 bg-muted/20 flex items-center justify-end border-t p-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedEvent(null)}
                className="text-xs"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
