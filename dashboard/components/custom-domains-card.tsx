"use client";

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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateCustomDomainMutation,
  useCustomDomainsQuery,
  useDeleteCustomDomainMutation,
  useVerifyCustomDomainMutation,
} from "@/hooks/use-custom-domains";
import { useTunnelSessionsQuery, useTunnelsQuery } from "@/hooks/use-tunnels";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { CustomDomain } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cloud,
  Copy,
  ExternalLink,
  Globe,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const customDomainSchema = z.object({
  domain: z
    .string()
    .min(1, "Domain is required")
    .max(253, "Domain must be at most 253 characters")
    .regex(
      /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,}$/i,
      "Enter a valid domain (e.g. app.example.com or example.com)",
    ),
  tunnelId: z.string().min(1, "Select a target tunnel"),
});

type CustomDomainFormValues = z.infer<typeof customDomainSchema>;

function CopyButton({
  value,
  label,
  className = "",
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className={`text-muted-foreground hover:text-foreground h-6 w-6 shrink-0 transition-colors ${className}`}
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function StatusBadge({ status }: { status: CustomDomain["status"] }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        Verified
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
        <AlertCircle className="h-3 w-3 text-amber-300" />
        Check DNS
      </span>
    );
  }
  return (
    <span className="border-border/80 bg-muted/60 text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
      <Globe className="text-muted-foreground h-3 w-3" />
      Pending Setup
    </span>
  );
}

function DnsRecordsPanel({ domain }: { domain: CustomDomain }) {
  return (
    <div className="border-border/70 bg-card/60 overflow-hidden rounded-lg border backdrop-blur-xs">
      {/* Zone Header */}
      <div className="border-border/60 bg-muted/30 flex flex-wrap items-center justify-between gap-2 border-b px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-foreground font-medium">Required DNS Records</span>
          <span className="bg-background/80 text-muted-foreground border-border/50 rounded border px-2 py-0.5 font-mono text-[11px]">
            Zone: <strong className="text-foreground">{domain.dns.zone}</strong>
          </span>
        </div>
        <span className="text-muted-foreground text-[11px]">
          Add these 2 records in your DNS provider (Cloudflare, Route 53, etc.)
        </span>
      </div>

      {/* Records Table */}
      <div className="divide-border/50 divide-y">
        {/* CNAME Row */}
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[70px_1fr_1.3fr_auto] sm:items-center sm:gap-3 sm:px-3.5">
          <div className="flex items-center gap-2 sm:block">
            <span className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-400">
              CNAME
            </span>
            <span className="text-muted-foreground text-[11px] sm:hidden">Routing record</span>
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/80 text-[10px] tracking-wider uppercase sm:hidden">
                Name:
              </span>
              <code className="bg-muted/50 text-foreground rounded px-1.5 py-0.5 font-mono text-xs font-semibold">
                {domain.dns.cname.name}
              </code>
              <CopyButton value={domain.dns.cname.name} label="CNAME host name" />
            </div>
            {domain.dns.cname.name !== domain.dns.cname.fullName && (
              <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <span>or FQDN:</span>
                <span className="truncate font-mono text-[10px]">{domain.dns.cname.fullName}</span>
                <CopyButton value={domain.dns.cname.fullName} label="CNAME full host name" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/80 text-[10px] tracking-wider uppercase sm:hidden">
                Target:
              </span>
              <code className="bg-muted/50 truncate rounded px-1.5 py-0.5 font-mono text-xs font-semibold text-emerald-400">
                {domain.dns.cname.value}
              </code>
              <CopyButton value={domain.dns.cname.value} label="CNAME target" />
            </div>
          </div>

          <div className="text-right sm:text-left">
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              <Cloud className="h-3 w-3" />
              Cloudflare Proxied
            </span>
          </div>
        </div>

        {/* TXT Row */}
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[70px_1fr_1.3fr_auto] sm:items-center sm:gap-3 sm:px-3.5">
          <div className="flex items-center gap-2 sm:block">
            <span className="rounded border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-violet-400">
              TXT
            </span>
            <span className="text-muted-foreground text-[11px] sm:hidden">Verification token</span>
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/80 text-[10px] tracking-wider uppercase sm:hidden">
                Name:
              </span>
              <code className="bg-muted/50 text-foreground rounded px-1.5 py-0.5 font-mono text-xs font-semibold">
                {domain.dns.txt.name}
              </code>
              <CopyButton value={domain.dns.txt.name} label="TXT host name" />
            </div>
            {domain.dns.txt.name !== domain.dns.txt.fullName && (
              <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <span>or FQDN:</span>
                <span className="truncate font-mono text-[10px]">{domain.dns.txt.fullName}</span>
                <CopyButton value={domain.dns.txt.fullName} label="TXT full host name" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/80 text-[10px] tracking-wider uppercase sm:hidden">
                Value:
              </span>
              <code className="bg-muted/50 text-foreground/90 truncate rounded px-1.5 py-0.5 font-mono text-xs font-semibold">
                {domain.dns.txt.value}
              </code>
              <CopyButton value={domain.dns.txt.value} label="TXT verification token" />
            </div>
          </div>

          <div className="text-right sm:text-left">
            <span className="border-border/60 bg-muted/40 text-muted-foreground inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-medium">
              DNS Only
            </span>
          </div>
        </div>
      </div>

      {/* Helpful DNS note */}
      <div className="border-border/50 bg-muted/20 text-muted-foreground border-t px-3.5 py-2 text-[11px] leading-relaxed">
        <strong className="text-foreground/90">Tip for Cloudflare users:</strong> Turn on the{" "}
        <span className="font-medium text-amber-400">Orange Cloud (Proxy)</span> on the CNAME record
        to get free automatic SSL and DDoS protection. tunl will seamlessly route requests to your
        local server based on the Host header.
      </div>
    </div>
  );
}

export default function CustomDomainsCard() {
  const { user } = useAuth();
  const { data: tunnels = [] } = useTunnelsQuery();
  const { data: activeSessions = [] } = useTunnelSessionsQuery();
  const { data: customDomains = [], isLoading } = useCustomDomainsQuery();
  const createMutation = useCreateCustomDomainMutation();
  const verifyMutation = useVerifyCustomDomainMutation();
  const deleteMutation = useDeleteCustomDomainMutation();

  const [deleteDomain, setDeleteDomain] = useState<CustomDomain | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [expandedDomainIds, setExpandedDomainIds] = useState<Record<string, boolean>>({});

  if (user?.role !== "admin") {
    return null;
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomDomainFormValues>({
    resolver: zodResolver(customDomainSchema),
    defaultValues: { domain: "", tunnelId: "" },
  });

  const toggleExpanded = (id: string) => {
    setExpandedDomainIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const onSubmit = (values: CustomDomainFormValues) => {
    createMutation.mutate(
      { domain: values.domain.trim(), tunnelId: values.tunnelId },
      {
        onSuccess: () => {
          toast.success("Custom domain added! Configure the DNS records below, then click Verify.");
          reset();
        },
        onError: (err) => {
          toast.error(err instanceof ApiClientError ? err.message : "Failed to add domain.");
        },
      },
    );
  };

  const handleVerify = (d: CustomDomain) => {
    setVerifyingId(d.id);
    verifyMutation.mutate(d.id, {
      onSuccess: (result) => {
        if (result.verified) {
          toast.success(`${d.domain} verified and actively routing to ${d.subdomain}.tunl.online!`);
        } else {
          toast.error(
            result.detail || "DNS records not detected yet. Propagation can take a few minutes.",
          );
        }
      },
      onError: (err) => {
        toast.error(err instanceof ApiClientError ? err.message : "Verification failed.");
      },
      onSettled: () => {
        setVerifyingId(null);
      },
    });
  };

  const confirmDelete = () => {
    if (!deleteDomain) return;
    deleteMutation.mutate(deleteDomain.id, {
      onSuccess: () => {
        toast.success(`Removed ${deleteDomain.domain}.`);
        setDeleteDomain(null);
      },
      onError: (err) => {
        toast.error(err instanceof ApiClientError ? err.message : "Failed to remove domain.");
      },
    });
  };

  return (
    <>
      <Card className="border-border/60 gap-0 rounded-xl p-0 shadow-none">
        {/* Card Header */}
        <div className="border-border/60 bg-muted/30 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="border-border/60 bg-background text-primary flex h-7 w-7 items-center justify-center rounded-md border">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-foreground text-sm font-semibold">Custom domains</h2>
                <span className="border-border/60 bg-secondary text-secondary-foreground rounded-md border px-2 py-0.5 text-[11px] font-semibold">
                  {customDomains.length}
                </span>
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                  Admin Preview
                </span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Route your custom domain to any active tunnel with CNAME and TXT verification.
              </p>
            </div>
          </div>

          <div className="border-border/60 bg-background/60 text-muted-foreground hidden items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] lg:flex">
            <ShieldCheck className="text-primary h-3.5 w-3.5" />
            <span>TLS via Cloudflare Proxied CNAME</span>
          </div>
        </div>

        {/* Add Domain Form */}
        <div className="border-border/60 border-b p-4 sm:p-5">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-3 lg:flex-row lg:items-end"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="custom-domain" className="text-foreground text-xs font-medium">
                Domain name
              </Label>
              <Input
                id="custom-domain"
                placeholder="app.example.com"
                disabled={createMutation.isPending || tunnels.length === 0}
                className="h-10 rounded-md font-mono text-sm"
                {...register("domain")}
                aria-invalid={!!errors.domain}
              />
              {errors.domain && <p className="text-destructive text-xs">{errors.domain.message}</p>}
            </div>

            <div className="space-y-1.5 lg:w-72">
              <Label htmlFor="custom-domain-tunnel" className="text-foreground text-xs font-medium">
                Target tunnel
              </Label>
              <div className="relative">
                <select
                  id="custom-domain-tunnel"
                  disabled={createMutation.isPending || tunnels.length === 0}
                  className="border-border/60 bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/40 h-10 w-full cursor-pointer appearance-none rounded-md border pr-8 pl-3 font-mono text-xs transition-all duration-200 outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register("tunnelId")}
                  aria-invalid={!!errors.tunnelId}
                >
                  <option value="">Select tunnel…</option>
                  {tunnels.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.subdomain}.tunl.online
                    </option>
                  ))}
                </select>
                <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2" />
              </div>
              {errors.tunnelId && (
                <p className="text-destructive text-xs">{errors.tunnelId.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={createMutation.isPending || tunnels.length === 0}
              size="lg"
              className="h-10 shrink-0 px-4 text-xs font-semibold"
            >
              {createMutation.isPending ? (
                <>
                  <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" />
                  Adding…
                </>
              ) : (
                <>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add domain
                </>
              )}
            </Button>
          </form>

          {tunnels.length === 0 && (
            <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Reserve a tunnel subdomain first. Custom domains map directly to your existing
              tunnels.
            </div>
          )}
        </div>

        {/* Domain List Body */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14">
            <div className="border-primary/20 border-t-primary h-5 w-5 animate-spin rounded-full border-2" />
            <p className="text-muted-foreground text-xs">Loading custom domains…</p>
          </div>
        ) : customDomains.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
            <Globe className="text-muted-foreground/30 h-8 w-8" />
            <div className="flex flex-col gap-1">
              <h3 className="text-foreground text-sm font-semibold">
                No custom domains configured
              </h3>
              <p className="text-muted-foreground max-w-md text-xs">
                Connect your personal or company domain (e.g. <code>api.example.com</code>) to route
                traffic directly to your tunnel with automatic SSL.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-border/60 divide-y">
            {customDomains.map((d) => {
              const live =
                d.status === "verified" && activeSessions.some((s) => s.subdomain === d.subdomain);
              const isVerifyingThis = verifyingId === d.id;
              const isExpanded = d.status !== "verified" || expandedDomainIds[d.id] === true;

              return (
                <div key={d.id} className="space-y-4 p-4 sm:p-5">
                  {/* Top domain bar */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {d.status === "verified" ? (
                          <a
                            href={`https://${d.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:text-primary inline-flex items-center gap-1.5 font-mono text-sm font-semibold transition-colors sm:text-base"
                          >
                            {d.domain}
                            <ExternalLink className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                          </a>
                        ) : (
                          <span className="text-foreground font-mono text-sm font-semibold sm:text-base">
                            {d.domain}
                          </span>
                        )}

                        <StatusBadge status={d.status} />

                        {live && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                            Live
                          </span>
                        )}
                      </div>

                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs">
                        <span className="text-foreground/80 inline-flex items-center gap-1">
                          <ArrowRight className="text-muted-foreground h-3 w-3" />
                          <span>{d.subdomain}.tunl.online</span>
                        </span>
                        {d.lastCheckedAt && (
                          <>
                            <span>·</span>
                            <span>
                              checked{" "}
                              {formatDistanceToNow(new Date(d.lastCheckedAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {d.status === "verified" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpanded(d.id)}
                          className="border-border/60 gap-1 text-xs"
                        >
                          {isExpanded ? (
                            <>
                              Hide DNS <ChevronUp className="h-3.5 w-3.5" />
                            </>
                          ) : (
                            <>
                              View DNS <ChevronDown className="h-3.5 w-3.5" />
                            </>
                          )}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant={d.status === "verified" ? "outline" : "default"}
                        disabled={isVerifyingThis}
                        onClick={() => handleVerify(d)}
                        className="gap-1.5 text-xs font-semibold whitespace-nowrap"
                      >
                        {isVerifyingThis ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Verifying…
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {d.status === "verified" ? "Re-verify" : "Verify DNS"}
                          </>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs whitespace-nowrap"
                        onClick={() => setDeleteDomain(d)}
                        title="Remove domain"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
                    </div>
                  </div>

                  {/* DNS Record Details Panel */}
                  {isExpanded && <DnsRecordsPanel domain={d} />}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deleteDomain}>
        <AlertDialogContent className="font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove custom domain {deleteDomain ? `"${deleteDomain.domain}"` : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed">
              Traffic to{" "}
              <strong className="text-foreground font-mono">{deleteDomain?.domain}</strong> will
              immediately stop forwarding to{" "}
              <strong className="text-foreground font-mono">
                {deleteDomain?.subdomain}.tunl.online
              </strong>
              . You can safely remove the CNAME and TXT records from your DNS provider.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDomain(null)} className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
            >
              {deleteMutation.isPending ? "Removing…" : "Remove domain"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
