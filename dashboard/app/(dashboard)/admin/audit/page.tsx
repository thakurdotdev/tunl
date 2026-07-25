"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAnalytics } from "@/hooks/use-admin";
import { Activity, ChevronLeft, ChevronRight, Globe, Search } from "lucide-react";
import { useMemo, useState } from "react";

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
  const { data: analytics, isLoading } = useAdminAnalytics();

  const [auditSearch, setAuditSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<
    "all" | "tunnel.connected" | "tunnel.disconnected"
  >("all");
  const [auditPage, setAuditPage] = useState(1);
  const pageSize = 12;

  const filteredEvents = useMemo(() => {
    if (!analytics?.recentEventsList) return [];

    return analytics.recentEventsList.filter((evt) => {
      if (eventTypeFilter !== "all" && evt.eventType !== eventTypeFilter) {
        return false;
      }
      if (auditSearch.trim()) {
        const query = auditSearch.toLowerCase();
        const matchesSubdomain = evt.subdomain?.toLowerCase().includes(query);
        const matchesEmail = evt.userEmail?.toLowerCase().includes(query);
        const matchesType = evt.eventType?.toLowerCase().includes(query);
        const matchesIp = evt.remoteIp?.toLowerCase().includes(query);
        return matchesSubdomain || matchesEmail || matchesType || matchesIp;
      }
      return true;
    });
  }, [analytics?.recentEventsList, eventTypeFilter, auditSearch]);

  const totalFiltered = filteredEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(auditPage, totalPages);

  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPage, pageSize]);

  const handleFilterChange = (filter: "all" | "tunnel.connected" | "tunnel.disconnected") => {
    setEventTypeFilter(filter);
    setAuditPage(1);
  };

  const handleSearchChange = (val: string) => {
    setAuditSearch(val);
    setAuditPage(1);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Main Audit Trail Container */}
      <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-lg border shadow-2xs">
        {/* Controls: Search & Filter Tabs */}
        <div className="border-border/60 bg-muted/20 flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search subdomain, email, or IP address..."
              value={auditSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-background/60 border-border/60 focus-visible:ring-primary/40 h-9 pl-9 font-mono text-xs"
            />
          </div>

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
              All Events ({analytics?.totalEvents ?? 0})
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
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="border-border/60 bg-muted/30 text-muted-foreground border-b text-[10px] font-semibold tracking-wider uppercase">
              <tr>
                <th className="p-3.5">Event</th>
                <th className="p-3.5">Subdomain Endpoint</th>
                <th className="p-3.5">User Account</th>
                <th className="p-3.5">Remote Client IP</th>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5 text-right">Age</th>
              </tr>
            </thead>
            <tbody className="divide-border/30 divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground py-16 text-center text-xs">
                    Loading historical audit logs...
                  </td>
                </tr>
              ) : paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="text-muted-foreground flex flex-col items-center justify-center gap-1.5">
                      <Activity className="mb-1 h-6 w-6 opacity-40" />
                      <span className="text-xs font-semibold">
                        No audit events match current criteria
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((evt) => {
                  const isConnected = evt.eventType === "tunnel.connected";
                  return (
                    <tr key={evt.id} className="hover:bg-muted/20 transition-colors">
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
                          <span className="inline-flex items-center gap-1.5 font-bold text-cyan-400">
                            <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            {evt.subdomain}.tunl.online
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </td>

                      <td className="text-muted-foreground p-3.5">
                        {evt.userEmail ? (
                          <span className="text-foreground font-medium">{evt.userEmail}</span>
                        ) : (
                          <span className="text-muted-foreground/60 italic">Anonymous device</span>
                        )}
                      </td>

                      <td className="text-muted-foreground p-3.5 font-mono">
                        {evt.remoteIp || <span className="text-muted-foreground/40">-</span>}
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Controls */}
        {totalFiltered > 0 && (
          <div className="border-border/60 bg-muted/10 flex items-center justify-between border-t p-4 font-mono text-xs">
            <span className="text-muted-foreground text-xs">
              Showing{" "}
              <span className="text-foreground font-semibold">
                {(currentPage - 1) * pageSize + 1}
              </span>
              –
              <span className="text-foreground font-semibold">
                {Math.min(currentPage * pageSize, totalFiltered)}
              </span>{" "}
              of <span className="text-foreground font-semibold">{totalFiltered}</span> audit logs
            </span>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3 font-mono text-xs font-medium"
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev
              </Button>

              <span className="text-muted-foreground px-2 font-medium">
                {currentPage} / {totalPages}
              </span>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setAuditPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-3 font-mono text-xs font-medium"
              >
                Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
