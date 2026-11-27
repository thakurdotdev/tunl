"use client";

import { GettingStarted } from "@/components/portal/getting-started";
import { PageHeader, StatPill } from "@/components/portal/page-header";
import { TunnelPasswordDialog, tunnelHasPassword } from "@/components/tunnel-password-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomDomainsQuery } from "@/hooks/use-custom-domains";
import {
  useCreateTunnelMutation,
  useDeleteTunnelMutation,
  useTunnelSessionsQuery,
  useTunnelsQuery,
} from "@/hooks/use-tunnels";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { inspectAnalyticsHref, inspectRequestsHref } from "@/lib/inspect-routes";
import type { CustomDomain, Tunnel, TunnelSession } from "@/lib/types";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Link2,
  Lock,
  MoreHorizontal,
  Network,
  Plus,
  Terminal,
  Trash2,
  Unlock,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const tunnelSchema = z.object({
  subdomain: z
    .string()
    .min(1, "Subdomain is required")
    .min(3, "Subdomain must be at least 3 characters")
    .max(63, "Subdomain must be at most 63 characters")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens are allowed"),
});

type TunnelFormValues = z.infer<typeof tunnelSchema>;

/* -------------------------------------------------------------------------- */
/*                                   Pieces                                   */
/* -------------------------------------------------------------------------- */

function useCopy() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copy = (text: string, id: string, message = "Copied to clipboard") => {
    navigator.clipboard.writeText(text).catch(() => {});
    toast.success(message);
    setCopiedId(id);
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1800);
  };
  return { copiedId, copy };
}

function CommandLine({
  command,
  copied,
  onCopy,
  tone = "muted",
}: {
  command: string;
  copied: boolean;
  onCopy: () => void;
  tone?: "muted" | "accent";
}) {
  return (
    <div className="surface-input bg-background flex min-w-0 items-center gap-2 rounded-lg border py-1.5 pr-1.5 pl-3 font-mono text-xs">
      <span className="text-muted-foreground/70 select-none">$</span>
      <code
        className={cn(
          "min-w-0 flex-1 truncate select-all",
          tone === "accent" ? "text-primary font-medium" : "text-muted-foreground",
        )}
        title={command}
      >
        {command}
      </code>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onCopy}
        aria-label="Copy command"
        className="shrink-0"
      >
        {copied ? <Check className="text-primary" /> : <Copy />}
      </Button>
    </div>
  );
}

function SideCard({
  title,
  icon: Icon,
  children,
  id,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="surface-card bg-card scroll-mt-20 rounded-xl border">
      <div className="flex items-center gap-2 px-4 pt-4">
        <Icon className="text-primary h-4 w-4" />
        <h2 className="text-foreground text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function connectionSummary(
  tunnel: Tunnel,
  sessions: TunnelSession[],
  sessionsLoading: boolean,
): string {
  if (sessions.length) {
    const oldest = sessions.reduce((a, b) =>
      new Date(a.connectedAt).getTime() <= new Date(b.connectedAt).getTime() ? a : b,
    );
    const since = formatDistanceToNow(new Date(oldest.connectedAt), { addSuffix: true });
    const count = sessions.length > 1 ? `${sessions.length} sessions · ` : "";
    return `${count}Connected ${since}${oldest.remoteIp ? ` from ${oldest.remoteIp}` : ""}`;
  }
  if (sessionsLoading) return "Checking connection…";
  if (tunnel.lastConnectedAt) {
    return `Last connected ${formatDistanceToNow(new Date(tunnel.lastConnectedAt), { addSuffix: true })}`;
  }
  return "Never connected";
}

function TunnelRow({
  tunnel,
  sessions,
  sessionsLoading,
  linkedDomain,
  allowlistOn,
  port,
  copiedId,
  onCopy,
  onPassword,
  onRevoke,
}: {
  tunnel: Tunnel;
  sessions: TunnelSession[];
  sessionsLoading: boolean;
  linkedDomain?: CustomDomain;
  allowlistOn: boolean;
  port: string;
  copiedId: string | null;
  onCopy: (text: string, id: string, message?: string) => void;
  onPassword: () => void;
  onRevoke: () => void;
}) {
  const host = `${tunnel.subdomain}.tunl.online`;
  const url = `https://${host}`;
  const isLive = sessions.length > 0;
  const isProtected = tunnelHasPassword(tunnel);
  const command = `ssh -R 80:localhost:${port || "3000"} -p 2222 ${tunnel.subdomain}@tunl.online`;

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            isLive
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground bg-muted/50 border-[var(--hairline-strong)]",
          )}
        >
          <Globe className="h-4 w-4" />
          {isLive && (
            <span className="ring-card absolute -top-0.5 -right-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 ring-2" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary inline-flex min-w-0 items-center gap-1.5 font-mono text-sm font-semibold break-all"
            >
              {host}
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
            </a>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                isLive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isLive ? "bg-emerald-500" : "bg-muted-foreground/50",
                )}
              />
              {isLive ? "Live" : "Offline"}
            </span>
          </div>
          <p
            className={cn(
              "mt-1 text-xs",
              isLive ? "text-emerald-700 dark:text-emerald-400/90" : "text-muted-foreground",
            )}
          >
            {connectionSummary(tunnel, sessions, sessionsLoading)}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={onPassword}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 transition-colors",
                isProtected
                  ? "border-amber-500/25 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 border-[var(--hairline-strong)]",
              )}
              title="Manage password protection"
            >
              {isProtected ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              {isProtected ? "Password" : "No password"}
            </button>
            <Link
              href="/access"
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 transition-colors",
                allowlistOn
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 border-[var(--hairline-strong)]",
              )}
              title="Manage the IP allowlist"
            >
              <Network className="h-3 w-3" />
              {allowlistOn ? "IP allowlist" : "Any IP"}
            </Link>
            {linkedDomain && (
              <Link
                href="/domains"
                className="text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex max-w-full items-center gap-1 rounded-md border border-[var(--hairline-strong)] px-2 py-0.5 font-mono transition-colors"
                title={`Custom domain · ${linkedDomain.status}`}
              >
                <Link2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{linkedDomain.domain}</span>
                {linkedDomain.status !== "verified" && (
                  <span className="font-sans text-amber-600 dark:text-amber-400">· pending</span>
                )}
              </Link>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`More actions for ${host}`}
                className="shrink-0"
              >
                <MoreHorizontal />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => onCopy(url, `url-${tunnel.id}`, "Copied public URL")}>
              <Copy /> Copy public URL
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
              <ExternalLink /> Open in new tab
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPassword}>
              <Lock /> {isProtected ? "Change password" : "Add password"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onRevoke}>
              <Trash2 /> Revoke subdomain
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col gap-2 sm:pl-12 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <CommandLine
            command={command}
            copied={copiedId === tunnel.id}
            onCopy={() => onCopy(command, tunnel.id, "Copied SSH command")}
          />
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2">
          <Button
            nativeButton={false}
            render={<Link href={inspectRequestsHref(tunnel.subdomain)} />}
            variant={isLive ? "default" : "outline"}
            className="h-8"
          >
            <Eye /> Requests
          </Button>
          <Button
            nativeButton={false}
            render={<Link href={inspectAnalyticsHref(tunnel.subdomain)} />}
            variant="outline"
            className="h-8"
          >
            <BarChart3 /> Analytics
          </Button>
        </div>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export default function TunnelsPage() {
  const { user } = useAuth();
  const { data: tunnels = [], isLoading } = useTunnelsQuery();
  const { data: activeSessions = [], isLoading: isSessionsLoading } = useTunnelSessionsQuery();
  const { data: customDomains = [] } = useCustomDomainsQuery();
  const createMutation = useCreateTunnelMutation();
  const deleteMutation = useDeleteTunnelMutation();

  const [revokeTunnel, setRevokeTunnel] = useState<Tunnel | null>(null);
  const [passwordTunnel, setPasswordTunnel] = useState<Tunnel | null>(null);
  const [port, setPort] = useState("3000");
  const { copiedId, copy } = useCopy();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TunnelFormValues>({
    resolver: zodResolver(tunnelSchema),
    defaultValues: { subdomain: "" },
  });

  const onSubmit = (values: TunnelFormValues) => {
    createMutation.mutate(values.subdomain, {
      onSuccess: () => {
        toast.success(`${values.subdomain}.tunl.online is yours`);
        reset();
      },
      onError: (err) => {
        toast.error(err instanceof ApiClientError ? err.message : "Failed to reserve subdomain.");
      },
    });
  };

  const handleRevokeConfirm = () => {
    if (!revokeTunnel) return;
    deleteMutation.mutate(revokeTunnel.id, {
      onSuccess: () => toast.success(`Revoked ${revokeTunnel.subdomain}.tunl.online`),
      onError: (err) =>
        toast.error(err instanceof ApiClientError ? err.message : "Failed to revoke subdomain."),
      onSettled: () => setRevokeTunnel(null),
    });
  };

  const allowlistOn = Boolean(user?.ipWhitelistEnabled && user?.allowedIps?.length);
  const maxTunnels = user?.plan?.maxReservedSubdomains ?? 1;
  const limitReached = tunnels.length >= maxTunnels;
  const liveCount = new Set(activeSessions.map((s) => s.subdomain)).size;

  const typed = watch("subdomain")?.trim();
  const quickCommand = `ssh -t -R 80:localhost:${port || "3000"} -p 2222 tunl.online`;

  // Live tunnels first, then most recently connected.
  const sortedTunnels = [...tunnels].sort((a, b) => {
    const liveA = activeSessions.some((s) => s.subdomain === a.subdomain) ? 1 : 0;
    const liveB = activeSessions.some((s) => s.subdomain === b.subdomain) ? 1 : 0;
    if (liveA !== liveB) return liveB - liveA;
    return new Date(b.lastConnectedAt ?? 0).getTime() - new Date(a.lastConnectedAt ?? 0).getTime();
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tunnels"
        description="Reserve a subdomain, run one SSH command, and your local port is live on HTTPS."
        actions={
          <>
            <StatPill icon={Globe} label="Reserved" value={`${tunnels.length} / ${maxTunnels}`} />
            <StatPill icon={Wifi} label="Live" value={liveCount} tone="live" />
          </>
        }
      />

      <GettingStarted />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ----------------------------- Tunnel list ----------------------------- */}
        <section className="surface-card bg-card min-w-0 overflow-hidden rounded-xl border">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hairline)] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <h2 className="text-foreground text-sm font-semibold">Your subdomains</h2>
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                {tunnels.length}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Commands use local port{" "}
              <span className="text-foreground font-mono font-medium">{port || "3000"}</span>
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3 p-5">
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="bg-muted h-9 w-9 animate-pulse rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
                    <div className="bg-muted/70 h-8 animate-pulse rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : tunnels.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="bg-muted/60 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--hairline)]">
                <Globe className="text-muted-foreground/70 h-6 w-6" />
              </div>
              <div>
                <h3 className="text-foreground text-sm font-semibold">No subdomains yet</h3>
                <p className="text-muted-foreground mt-1 max-w-sm text-xs leading-relaxed">
                  Reserve a name to get a stable URL, or run the quick-connect command for a random
                  one.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => document.getElementById("subdomain")?.focus()}
              >
                <Plus /> Reserve a subdomain
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--hairline)]">
              {sortedTunnels.map((tunnel) => (
                <TunnelRow
                  key={tunnel.id}
                  tunnel={tunnel}
                  sessions={activeSessions.filter((s) => s.subdomain === tunnel.subdomain)}
                  sessionsLoading={isSessionsLoading}
                  linkedDomain={customDomains.find((d) => d.tunnelId === tunnel.id)}
                  allowlistOn={allowlistOn}
                  port={port}
                  copiedId={copiedId}
                  onCopy={copy}
                  onPassword={() => setPasswordTunnel(tunnel)}
                  onRevoke={() => setRevokeTunnel(tunnel)}
                />
              ))}
            </ul>
          )}
        </section>

        {/* ------------------------------ Side column ----------------------------- */}
        <aside
          className={cn(
            "flex min-w-0 flex-col gap-4 lg:sticky lg:top-6",
            tunnels.length === 0 && "max-lg:order-first",
          )}
        >
          <SideCard title="Reserve a subdomain" icon={Plus}>
            {limitReached ? (
              <div className="text-xs">
                <p className="text-foreground font-medium">
                  You’re using all {maxTunnels} reserved subdomain{maxTunnels === 1 ? "" : "s"}.
                </p>
                <p className="text-muted-foreground mt-1 leading-relaxed">
                  Revoke one from the ⋯ menu to free a slot.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2.5">
                <Label htmlFor="subdomain" className="sr-only">
                  Subdomain name
                </Label>
                <div className="relative flex items-center">
                  <Input
                    id="subdomain"
                    placeholder="my-app"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={createMutation.isPending}
                    className="h-9 scroll-mt-24 pr-24 font-mono text-sm"
                    {...register("subdomain")}
                    aria-invalid={!!errors.subdomain}
                    aria-describedby="subdomain-help"
                  />
                  <span className="text-muted-foreground pointer-events-none absolute right-3 font-mono text-xs select-none">
                    .tunl.online
                  </span>
                </div>
                <p
                  id="subdomain-help"
                  className={cn(
                    "text-xs",
                    errors.subdomain ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {errors.subdomain?.message ??
                    (typed
                      ? `You’ll get https://${typed}.tunl.online`
                      : `Lowercase letters, numbers and hyphens · ${maxTunnels - tunnels.length} left`)}
                </p>
                <Button type="submit" disabled={createMutation.isPending} className="h-9">
                  {createMutation.isPending ? "Reserving…" : "Reserve"}
                </Button>
              </form>
            )}
          </SideCard>

          <SideCard title="Quick connect" icon={Terminal} id="quick-connect">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="quickPort" className="text-muted-foreground text-xs font-normal">
                  Local port of your app
                </Label>
                <Input
                  id="quickPort"
                  inputMode="numeric"
                  value={port}
                  onChange={(e) => setPort(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="3000"
                  className="h-8 w-20 text-center font-mono text-xs"
                />
              </div>
              <CommandLine
                command={quickCommand}
                tone="accent"
                copied={copiedId === "quick"}
                onCopy={() => copy(quickCommand, "quick", "Copied SSH command")}
              />
              <p className="text-muted-foreground text-xs leading-relaxed">
                No reservation needed: you get a random URL for as long as the command runs.
              </p>
            </div>
          </SideCard>

          <Link
            href="/domains"
            className="group surface-card bg-card flex items-center gap-3 rounded-xl border p-4 transition-colors hover:border-[var(--hairline-strong)]"
          >
            <Link2 className="text-primary h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-medium">Custom domains</p>
              <p className="text-muted-foreground text-xs">
                {customDomains.length
                  ? `${customDomains.length} connected`
                  : "Serve a tunnel from your own hostname"}
              </p>
            </div>
            <ArrowRight className="text-muted-foreground group-hover:text-foreground h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </aside>
      </div>

      <AlertDialog open={!!revokeTunnel}>
        <AlertDialogContent className="font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {revokeTunnel?.subdomain}.tunl.online?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs">
              The name goes back to the pool and anyone could claim it. Active connections on this
              subdomain are dropped immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRevokeTunnel(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeConfirm}
              variant="danger"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Revoking…" : "Revoke subdomain"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TunnelPasswordDialog tunnel={passwordTunnel} onClose={() => setPasswordTunnel(null)} />
    </div>
  );
}
