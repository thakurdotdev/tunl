"use client";

import { IpAllowlistCard } from "@/components/access/ip-allowlist-card";
import { PageHeader } from "@/components/portal/page-header";
import { TunnelPasswordDialog, tunnelHasPassword } from "@/components/tunnel-password-dialog";
import { Button } from "@/components/ui/button";
import { useUpdateIpWhitelist } from "@/hooks/use-profile";
import { useTunnelsQuery } from "@/hooks/use-tunnels";
import { useAuth } from "@/lib/auth-context";
import type { Tunnel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowRight, Globe, KeyRound, Lock, Network, Unlock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function SummaryTile({
  icon: Icon,
  title,
  value,
  detail,
  good,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  detail: string;
  good: boolean;
}) {
  return (
    <div className="surface-card bg-card flex items-start gap-3 rounded-xl border p-4">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          good
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          {title}
        </p>
        <p className="text-foreground mt-0.5 text-base font-semibold">{value}</p>
        <p className="text-muted-foreground text-xs">{detail}</p>
      </div>
    </div>
  );
}

export default function AccessControlPage() {
  const { user } = useAuth();
  const { data: tunnels = [], isLoading: tunnelsLoading } = useTunnelsQuery();
  const updateIpWhitelist = useUpdateIpWhitelist();
  const [passwordTunnel, setPasswordTunnel] = useState<Tunnel | null>(null);

  if (!user) return null;

  const ruleCount = user.allowedIps?.length ?? 0;
  const allowlistOn = Boolean(user.ipWhitelistEnabled && ruleCount > 0);
  const protectedCount = tunnels.filter(tunnelHasPassword).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Access control"
        description="Choose who can reach your public tunnel URLs. Layer an IP allowlist with per-tunnel passwords for private previews, webhooks and staging builds."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          icon={Network}
          title="IP allowlist"
          value={allowlistOn ? "Enforcing" : "Off"}
          detail={
            allowlistOn
              ? `${ruleCount} ${ruleCount === 1 ? "address" : "addresses"} allowed`
              : "Open to any IP"
          }
          good={allowlistOn}
        />
        <SummaryTile
          icon={Lock}
          title="Password protected"
          value={tunnelsLoading ? "–" : `${protectedCount} of ${tunnels.length}`}
          detail="Tunnels behind Basic Auth"
          good={protectedCount > 0}
        />
        <SummaryTile
          icon={KeyRound}
          title="Sign-in security"
          value={user.twoFactorEnabled ? "2FA on" : "2FA off"}
          detail="Protects your account itself"
          good={Boolean(user.twoFactorEnabled)}
        />
      </div>

      <IpAllowlistCard
        key={`${user.ipWhitelistEnabled}-${user.allowedIps?.join(",")}`}
        profile={user}
        onSave={(params) => updateIpWhitelist.mutateAsync(params)}
        isPending={updateIpWhitelist.isPending}
      />

      {/* Per-tunnel passwords */}
      <section className="surface-card bg-card overflow-hidden rounded-xl border">
        <div className="flex flex-col gap-1 p-5">
          <h2 className="text-foreground text-[15px] font-semibold">Tunnel passwords</h2>
          <p className="text-muted-foreground text-[13px]">
            Ask visitors for a password before they see a specific tunnel. Works together with the
            IP allowlist.
          </p>
        </div>
        {tunnelsLoading ? (
          <div className="space-y-2 border-t border-[var(--hairline)] p-5">
            <div className="bg-muted h-10 animate-pulse rounded-lg" />
            <div className="bg-muted/70 h-10 animate-pulse rounded-lg" />
          </div>
        ) : tunnels.length === 0 ? (
          <div className="flex flex-col items-start gap-3 border-t border-[var(--hairline)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              Reserve a subdomain first, then protect it here.
            </p>
            <Button nativeButton={false} render={<Link href="/dashboard" />} variant="outline">
              <Globe /> Reserve a subdomain
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--hairline)] border-t border-[var(--hairline)]">
            {tunnels.map((tunnel) => {
              const isProtected = tunnelHasPassword(tunnel);
              return (
                <li
                  key={tunnel.id}
                  className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        isProtected
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isProtected ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-foreground truncate font-mono text-[13px] font-semibold">
                        {tunnel.subdomain}.tunl.online
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {isProtected ? "Password required" : "Public — no password"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={isProtected ? "outline" : "secondary"}
                    onClick={() => setPasswordTunnel(tunnel)}
                    className="self-start sm:self-auto"
                  >
                    {isProtected ? "Change password" : "Add password"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link
        href="/profile"
        className="group surface-card bg-card flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors hover:border-[var(--hairline-strong)]"
      >
        <div className="flex items-center gap-3">
          <KeyRound className="text-muted-foreground h-4 w-4" />
          <div>
            <p className="text-foreground text-sm font-medium">Protect your tunl account</p>
            <p className="text-muted-foreground text-xs">
              Two-factor authentication and passkeys live in Account settings.
            </p>
          </div>
        </div>
        <ArrowRight className="text-muted-foreground group-hover:text-foreground h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </Link>

      <TunnelPasswordDialog tunnel={passwordTunnel} onClose={() => setPasswordTunnel(null)} />
    </div>
  );
}
