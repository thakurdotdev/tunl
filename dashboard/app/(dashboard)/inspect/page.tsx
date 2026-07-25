"use client";

import { Button } from "@/components/ui/button";
import { useTunnelsQuery, useTunnelSessionsQuery } from "@/hooks/use-tunnels";
import { Eye, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";

export default function InspectLandingPage() {
  const { data: tunnels = [] } = useTunnelsQuery();
  const { data: sessions = [] } = useTunnelSessionsQuery();

  const activeSubdomains = sessions.map((s) => s.subdomain);
  const allSubdomains = [
    ...new Set([...sessions.map((s) => s.subdomain), ...tunnels.map((t) => t.subdomain)]),
  ];

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="border-border/60 flex flex-col gap-1 border-b pb-5">
        <h1 className="text-foreground text-xl font-bold tracking-tight">Request Inspector</h1>
        <p className="text-muted-foreground text-xs">
          Select a tunnel endpoint to inspect real-time HTTP traffic, headers, and payloads
          (retained for up to 30 minutes).
        </p>
      </div>

      {allSubdomains.length === 0 ? (
        <div className="border-border/60 bg-card flex flex-col items-center justify-center gap-4 rounded-lg border py-16 shadow-2xs">
          <WifiOff className="text-muted-foreground/30 h-10 w-10" />
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-sm font-semibold">No tunnels available</h3>
            <p className="text-muted-foreground max-w-sm text-xs">
              Reserve a subdomain or start a tunnel session to begin inspecting HTTP traffic.
            </p>
          </div>
          <Link href="/dashboard">
            <Button size="sm" className="text-xs font-semibold">
              Go to Tunnels
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allSubdomains.map((subdomain) => {
            const isActive = activeSubdomains.includes(subdomain);
            return (
              <Link
                key={subdomain}
                href={`/inspect/${subdomain}`}
                className="border-border/60 bg-card hover:border-border/80 hover:bg-muted/30 group flex flex-col gap-3 rounded-lg border p-5 shadow-2xs transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <Wifi className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <WifiOff className="text-muted-foreground/50 h-4 w-4" />
                    )}
                    <span className="text-foreground font-mono text-sm font-semibold">
                      {subdomain}
                    </span>
                  </div>
                  <Eye className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-colors" />
                </div>
                <div className="flex items-center justify-between font-sans text-xs">
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {subdomain}.tunl.online
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                      isActive
                        ? "border border-emerald-500/20 bg-emerald-500/15 text-emerald-400"
                        : "bg-muted text-muted-foreground border-border/60 border"
                    }`}
                  >
                    {isActive ? "Live" : "Offline"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
