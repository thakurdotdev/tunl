"use client";

import { IpAllowlistCard } from "@/components/access/ip-allowlist-card";
import { PageHeader } from "@/components/portal/page-header";
import { TunnelPasswordDialog, tunnelHasPassword } from "@/components/tunnel-password-dialog";
import { Button } from "@/components/ui/button";
import { useUpdateIpWhitelist } from "@/hooks/use-profile";
import { useTunnelsQuery } from "@/hooks/use-tunnels";
import { useAuth } from "@/lib/auth-context";
import type { Tunnel } from "@/lib/types";
import { Globe, Lock, Unlock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function AccessControlPage() {
  const { user } = useAuth();
  const { data: tunnels = [], isLoading: tunnelsLoading } = useTunnelsQuery();
  const updateIpWhitelist = useUpdateIpWhitelist();
  const [passwordTunnel, setPasswordTunnel] = useState<Tunnel | null>(null);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Access control" description="Choose who can open your tunnel URLs." />

      <IpAllowlistCard
        key={`${user.ipWhitelistEnabled}-${user.allowedIps?.join(",")}`}
        profile={user}
        onSave={(params) => updateIpWhitelist.mutateAsync(params)}
        isPending={updateIpWhitelist.isPending}
      />

      {/* Per-tunnel passwords */}
      <section className="surface-card bg-card overflow-hidden rounded-xl border">
        <div className="p-5">
          <h2 className="text-foreground text-[15px] font-semibold">Tunnel passwords</h2>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Visitors must enter a password first.
          </p>
        </div>
        {tunnelsLoading ? (
          <div className="space-y-2 border-t border-[var(--hairline)] p-5">
            <div className="bg-muted h-10 animate-pulse rounded-lg" />
            <div className="bg-muted/70 h-10 animate-pulse rounded-lg" />
          </div>
        ) : tunnels.length === 0 ? (
          <div className="flex flex-col items-start gap-3 border-t border-[var(--hairline)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">No subdomains yet.</p>
            <Button nativeButton={false} render={<Link href="/dashboard" />} variant="outline">
              <Globe /> Reserve a subdomain
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--hairline)] border-t border-[var(--hairline)]">
            {tunnels.map((tunnel) => {
              const isProtected = tunnelHasPassword(tunnel);
              return (
                <li key={tunnel.id} className="flex items-center gap-3 px-5 py-2.5">
                  {isProtected ? (
                    <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Unlock className="text-muted-foreground/60 h-4 w-4 shrink-0" />
                  )}
                  <p className="text-foreground min-w-0 flex-1 truncate font-mono text-[13px] font-medium">
                    {tunnel.subdomain}
                    <span className="text-muted-foreground font-normal">.tunl.online</span>
                  </p>
                  <Button
                    variant={isProtected ? "ghost" : "outline"}
                    size="sm"
                    onClick={() => setPasswordTunnel(tunnel)}
                    aria-label={`${isProtected ? "Change" : "Set"} password for ${tunnel.subdomain}`}
                  >
                    {isProtected ? "Change" : "Set password"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <TunnelPasswordDialog tunnel={passwordTunnel} onClose={() => setPasswordTunnel(null)} />
    </div>
  );
}
