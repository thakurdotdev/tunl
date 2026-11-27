"use client";

import { GettingStarted } from "@/components/portal/getting-started";
import { PageHeader } from "@/components/portal/page-header";
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
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Lock,
  MoreHorizontal,
  Plus,
  Terminal,
  Trash2,
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
  meta,
  children,
  id,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  meta?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="surface-card bg-card scroll-mt-20 rounded-xl border p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="text-primary h-4 w-4" />
        <h2 className="text-foreground flex-1 text-sm font-semibold">{title}</h2>
        {meta && <span className="text-muted-foreground text-xs">{meta}</span>}
      </div>
      {children}
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
    const since = formatDistanceToNow(new Date(oldest.connectedAt));
    return sessions.length > 1 ? `Live · ${sessions.length} sessions` : `Live for ${since}`;
  }
  if (sessionsLoading) return "Checking…";
  if (tunnel.lastConnectedAt) {
    return `Offline · seen ${formatDistanceToNow(new Date(tunnel.lastConnectedAt), { addSuffix: true })}`;
  }
  return "Never connected";
}

function TunnelRow({
  tunnel,
  sessions,
  sessionsLoading,
  linkedDomain,
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
  const localPort = port || "3000";
  const command = `ssh -R 80:localhost:${localPort} -p 2222 ${tunnel.subdomain}@tunl.online`;
  const copied = copiedId === tunnel.id;

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            isLive
              ? "bg-emerald-500 shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-emerald-500)_20%,transparent)]"
              : "bg-muted-foreground/40",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary truncate font-mono text-sm font-semibold"
              title={`Open ${host}`}
            >
              {tunnel.subdomain}
              <span className="text-muted-foreground font-normal">.tunl.online</span>
            </a>
            {isProtected && (
              <Lock
                className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                aria-label="Password protected"
              />
            )}
          </div>
          <p
            className={cn(
              "mt-0.5 truncate text-xs",
              isLive ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground",
            )}
          >
            {connectionSummary(tunnel, sessions, sessionsLoading)}
            {linkedDomain && (
              <span className="text-muted-foreground">
                {" · "}
                {linkedDomain.domain}
                {linkedDomain.status !== "verified" && " (pending)"}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 max-sm:pl-5">
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          title={command}
          onClick={() =>
            onCopy(command, tunnel.id, `Copied. Run it to forward localhost:${localPort}`)
          }
        >
          {copied ? <Check className="text-primary" /> : <Terminal />}
          Copy command
        </Button>
        <Button
          nativeButton={false}
          render={<Link href={inspectRequestsHref(tunnel.subdomain)} />}
          variant="outline"
          size="sm"
          className="h-8"
        >
          <Eye /> Requests
        </Button>
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
            <DropdownMenuItem render={<Link href={inspectAnalyticsHref(tunnel.subdomain)} />}>
              <BarChart3 /> Analytics
            </DropdownMenuItem>
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
        description={
          liveCount > 0
            ? `${liveCount} live now · ${tunnels.length} reserved`
            : "Put a local port on a public HTTPS URL."
        }
      />

      <GettingStarted />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ----------------------------- Tunnel list ----------------------------- */}
        <section
          className={cn(
            "surface-card bg-card min-w-0 overflow-hidden rounded-xl border",
            !isLoading && tunnels.length === 0 && "max-lg:hidden",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hairline)] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <h2 className="text-foreground text-sm font-semibold">Your subdomains</h2>
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                {tunnels.length}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3 p-5">
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
                    <div className="bg-muted/70 h-3 w-1/4 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : tunnels.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="bg-muted/60 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--hairline)]">
                <Globe className="text-muted-foreground/70 h-6 w-6" />
              </div>
              <h3 className="text-foreground text-sm font-semibold">No subdomains yet</h3>
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
          <SideCard
            title="Reserve a subdomain"
            icon={Plus}
            meta={limitReached ? undefined : `${maxTunnels - tunnels.length} left`}
          >
            {limitReached ? (
              <p className="text-muted-foreground text-xs">
                All {maxTunnels} used. Revoke one to free a slot.
              </p>
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
                    aria-describedby={errors.subdomain || typed ? "subdomain-help" : undefined}
                  />
                  <span className="text-muted-foreground pointer-events-none absolute right-3 font-mono text-xs select-none">
                    .tunl.online
                  </span>
                </div>
                {(errors.subdomain || typed) && (
                  <p
                    id="subdomain-help"
                    className={cn(
                      "truncate text-xs",
                      errors.subdomain ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {errors.subdomain?.message ?? `https://${typed}.tunl.online`}
                  </p>
                )}
                <Button type="submit" disabled={createMutation.isPending} className="h-9">
                  {createMutation.isPending ? "Reserving…" : "Reserve"}
                </Button>
              </form>
            )}
          </SideCard>

          <SideCard title="Quick connect" icon={Terminal} id="quick-connect" meta="random URL">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="quickPort" className="text-muted-foreground text-xs font-normal">
                  Local port
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
            </div>
          </SideCard>
        </aside>
      </div>

      <AlertDialog open={!!revokeTunnel}>
        <AlertDialogContent className="font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke {revokeTunnel?.subdomain}.tunl.online?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs">
              Anyone can claim the name after this, and active connections drop now.
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
