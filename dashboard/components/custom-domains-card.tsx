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
import { CustomDomainIntroDialog } from "@/components/custom-domain-intro-dialog";
import {
  useCreateCustomDomainMutation,
  useCustomDomainsQuery,
  useDeleteCustomDomainMutation,
  useVerifyCustomDomainMutation,
} from "@/hooks/use-custom-domains";
import { useTunnelSessionsQuery, useTunnelsQuery } from "@/hooks/use-tunnels";
import { ApiClientError } from "@/lib/api-client";
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
  Clock,
  Cloud,
  Copy,
  ExternalLink,
  Globe,
  Info,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

/* -------------------------------------------------------------------------- */
/*                                 Validation                                 */
/* -------------------------------------------------------------------------- */

const HOSTNAME_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function validateDomainName(value: string): string | null {
  const domain = value.trim().toLowerCase().replace(/\.+$/, "");
  if (!domain) return "Domain is required";
  if (domain.length > 253) return "Domain must be at most 253 characters";
  if (domain.includes(" ") || domain.includes("/") || domain.includes(":") || domain.includes("..")) {
    return "Enter a valid hostname (e.g. app.example.com)";
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return "Enter a hostname, not an IP address";
  const labels = domain.split(".");
  if (labels.length < 2) return "Domain must include a TLD (e.g. app.example.com)";
  for (const label of labels) {
    if (!HOSTNAME_LABEL.test(label)) return `Invalid domain label: '${label}'`;
  }
  return null;
}

const customDomainSchema = z.object({
  domain: z
    .string()
    .min(1, "Domain is required")
    .max(253, "Domain must be at most 253 characters")
    .superRefine((value, ctx) => {
      const error = validateDomainName(value);
      if (error) ctx.addIssue({ code: "custom", message: error });
    })
    .transform((value) => value.trim().toLowerCase().replace(/\.+$/, "")),
  tunnelId: z.string().uuid("Select a target tunnel"),
});

type CustomDomainFormValues = z.input<typeof customDomainSchema>;
type CustomDomainSubmitValues = z.output<typeof customDomainSchema>;

/* -------------------------------------------------------------------------- */
/*                               Small components                             */
/* -------------------------------------------------------------------------- */

/**
 * Click-to-copy field. The whole field is the button, so the target is large
 * and the value is always visible next to its copy affordance.
 */
function CopyField({
  value,
  label,
  prefix,
  subtle = false,
  valueClassName = "text-foreground",
}: {
  value: string;
  label: string;
  prefix?: string;
  subtle?: boolean;
  valueClassName?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).catch(() => { });
    setCopied(true);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopied(false), 1500);
  };

  const base =
    "group inline-flex min-w-0 items-center gap-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
  const variant = subtle
    ? "max-w-full rounded px-0.5 text-[11px] text-muted-foreground hover:text-foreground"
    : "w-full justify-between rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5 hover:border-border hover:bg-muted/50";

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      className={`${base} ${variant}`}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {prefix && <span className="text-muted-foreground shrink-0">{prefix}</span>}
        <span
          className={`truncate font-mono ${subtle ? "text-[11px]" : "text-[13px] font-medium"} ${subtle ? "" : valueClassName
            }`}
        >
          {value}
        </span>
      </span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      ) : (
        <Copy className="text-muted-foreground group-hover:text-foreground h-3.5 w-3.5 shrink-0 transition-colors" />
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: CustomDomain["status"] }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Verified
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
        <AlertCircle className="h-3 w-3" />
        Check DNS
      </span>
    );
  }
  return (
    <span className="border-border/70 bg-muted/50 text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
      <Clock className="h-3 w-3" />
      Pending setup
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 DNS records                                */
/* -------------------------------------------------------------------------- */

const DNS_GRID =
  "grid grid-cols-1 gap-2.5 px-4 sm:grid-cols-[72px_minmax(0,1fr)_minmax(0,1.3fr)_116px] sm:gap-4";

function MobileLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground block text-[11px] sm:hidden">{children}</span>;
}

function DnsRecordRow({
  type,
  description,
  name,
  fullName,
  value,
  valueLabel,
  valueClassName,
  badge,
}: {
  type: "CNAME" | "TXT";
  description: string;
  name: string;
  fullName: string;
  value: string;
  valueLabel: string;
  valueClassName?: string;
  badge: React.ReactNode;
}) {
  const typeStyles =
    type === "CNAME"
      ? "border-sky-500/30 bg-sky-500/10 text-sky-400"
      : "border-violet-500/30 bg-violet-500/10 text-violet-400";

  return (
    <div className={`${DNS_GRID} py-3.5`}>
      <div className="flex items-center gap-2 sm:block sm:pt-1">
        <span
          className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${typeStyles}`}
        >
          {type}
        </span>
        <span className="text-muted-foreground text-[11px] sm:hidden">{description}</span>
      </div>

      <div className="min-w-0 space-y-1.5">
        <MobileLabel>Name</MobileLabel>
        <CopyField value={name} label={`${type} host name`} />
        {name !== fullName && (
          <CopyField value={fullName} label={`${type} full host name`} prefix="FQDN" subtle />
        )}
      </div>

      <div className="min-w-0 space-y-1.5">
        <MobileLabel>{valueLabel}</MobileLabel>
        <CopyField
          value={value}
          label={type === "CNAME" ? "CNAME target" : "TXT verification token"}
          valueClassName={valueClassName}
        />
      </div>

      <div className="sm:pt-1.5">{badge}</div>
    </div>
  );
}

function DnsRecordsPanel({ domain }: { domain: CustomDomain }) {
  return (
    <div className="border-border/60 bg-muted/10 mt-4 overflow-hidden rounded-lg border">
      {/* Panel header */}
      <div className="border-border/60 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-foreground text-[13px] font-semibold">Required DNS records</h3>
          <span className="text-muted-foreground text-xs">
            Zone <span className="text-foreground font-mono font-medium">{domain.dns.zone}</span>
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          Add both records at your DNS provider, then click Verify DNS.
        </p>
      </div>

      {/* Column headers (desktop only) */}
      <div
        className={`${DNS_GRID} text-muted-foreground border-border/50 hidden border-b py-2 text-[11px] font-medium sm:grid`}
      >
        <span>Type</span>
        <span>Name</span>
        <span>Value</span>
        <span>Proxy</span>
      </div>

      {/* Records */}
      <div className="divide-border/50 divide-y">
        <DnsRecordRow
          type="CNAME"
          description="Routes traffic to tunl"
          name={domain.dns.cname.name}
          fullName={domain.dns.cname.fullName}
          value={domain.dns.cname.value}
          valueLabel="Target"
          valueClassName="text-emerald-400"
          badge={
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-amber-300">
              <Cloud className="h-3 w-3" />
              Proxied
            </span>
          }
        />
        <DnsRecordRow
          type="TXT"
          description="Proves you own the domain"
          name={domain.dns.txt.name}
          fullName={domain.dns.txt.fullName}
          value={domain.dns.txt.value}
          valueLabel="Value"
          badge={
            <span className="border-border/60 bg-muted/40 text-muted-foreground inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap">
              DNS only
            </span>
          }
        />
      </div>

      {/* Cloudflare tip */}
      <div className="border-border/50 bg-muted/20 text-muted-foreground flex items-start gap-2 border-t px-4 py-3 text-xs leading-relaxed">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
        <p>
          <span className="text-foreground/90 font-medium">Using Cloudflare?</span> Turn on the
          orange cloud (Proxy) for the CNAME record to get free automatic SSL and DDoS protection.
          tunl routes requests to your local server based on the Host header.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Card                                    */
/* -------------------------------------------------------------------------- */

export default function CustomDomainsCard() {
  const customDomainsQuery = useCustomDomainsQuery();
  const tunnelsQuery = useTunnelsQuery();
  const sessionsQuery = useTunnelSessionsQuery();
  const createMutation = useCreateCustomDomainMutation();
  const verifyMutation = useVerifyCustomDomainMutation();
  const deleteMutation = useDeleteCustomDomainMutation();

  const [deleteDomain, setDeleteDomain] = useState<CustomDomain | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [expandedDomainIds, setExpandedDomainIds] = useState<Record<string, boolean>>({});
  const [showIntroDialog, setShowIntroDialog] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  // Check if user has already seen the custom domain intro dialog or dismissed banner
  useEffect(() => {
    try {
      const introSeen = localStorage.getItem("tunl_custom_domain_intro_seen");
      if (!introSeen) {
        setShowIntroDialog(true);
      }
      const bannerDismissed = localStorage.getItem("tunl_custom_domain_banner_dismissed");
      if (bannerDismissed === "true") {
        setShowBanner(false);
      }
    } catch {}
  }, []);

  const customDomains = useMemo(() => customDomainsQuery.data ?? [], [customDomainsQuery.data]);
  const tunnels = useMemo(() => tunnelsQuery.data ?? [], [tunnelsQuery.data]);
  const activeSubdomains = useMemo(
    () => new Set((sessionsQuery.data ?? []).map((s) => s.subdomain)),
    [sessionsQuery.data],
  );

  // 1 tunnel = 1 custom domain: hide tunnels that are already linked.
  const linkedTunnelIds = useMemo(
    () => new Set(customDomains.map((d) => d.tunnelId)),
    [customDomains],
  );
  const availableTunnels = useMemo(
    () => tunnels.filter((t) => !linkedTunnelIds.has(t.id)),
    [tunnels, linkedTunnelIds],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomDomainFormValues>({
    resolver: zodResolver(customDomainSchema),
    defaultValues: { domain: "", tunnelId: "" },
  });

  const toggleExpanded = (id: string, currentlyExpanded: boolean) => {
    setExpandedDomainIds((prev) => ({ ...prev, [id]: !currentlyExpanded }));
  };

  const onSubmit = (values: CustomDomainFormValues) => {
    const parsed = customDomainSchema.parse(values) as CustomDomainSubmitValues;
    if (linkedTunnelIds.has(parsed.tunnelId)) {
      toast.error("That tunnel already has a custom domain (1 tunnel = 1 domain).");
      return;
    }
    if (customDomains.some((d) => d.domain.toLowerCase() === parsed.domain)) {
      toast.error(`${parsed.domain} is already added.`);
      return;
    }
    createMutation.mutate(
      { domain: parsed.domain, tunnelId: parsed.tunnelId },
      {
        onSuccess: () => {
          toast.success("Custom domain added! Add the DNS records below, then click Verify DNS.");
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
          toast.success(`${d.domain} verified — now routing to ${d.subdomain}.tunl.online!`);
        } else {
          toast.error(
            result.detail || "DNS records not detected yet. Propagation can take a few minutes.",
            { duration: 6000 },
          );
          setExpandedDomainIds((prev) => ({ ...prev, [d.id]: true }));
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

  const formDisabled = createMutation.isPending || tunnels.length === 0;

  return (
    <>
      <Card className="border-border/60 gap-0 overflow-hidden rounded-xl p-0 shadow-none">
        {/* ------------------------------ Header ------------------------------ */}
        <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="border-border/60 bg-muted/40 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border">
              <Globe className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-foreground text-sm font-semibold">Custom domains</h2>
                <span className="bg-secondary text-secondary-foreground min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums">
                  {customDomains.length}
                </span>
                <button
                  type="button"
                  onClick={() => setShowIntroDialog(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                  title="Click to learn how Custom Domains work"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>New Feature</span>
                </button>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                One domain per tunnel. Verify ownership with CNAME + TXT, then traffic routes
                automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-muted-foreground hidden items-center gap-1.5 text-xs lg:flex">
              <ShieldCheck className="text-primary h-3.5 w-3.5" />
              <span>TLS via Cloudflare proxied CNAME</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowIntroDialog(true)}
              className="h-8 gap-1.5 text-xs font-medium text-foreground hover:bg-muted/60"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>How it works</span>
            </Button>
          </div>
        </div>

        {/* --------------------------- Feature Banner --------------------------- */}
        {showBanner && (
          <div className="border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="border-border/60 bg-primary/15 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <p className="text-foreground text-xs">
                <strong className="font-semibold">New:</strong> Connect your personal or company domain (e.g. <code className="font-mono text-primary font-medium">api.yourbrand.com</code>) directly to your tunnels with automated SSL.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowIntroDialog(true)}
                className="text-primary hover:underline text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                Learn how it works →
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBanner(false);
                  try {
                    localStorage.setItem("tunl_custom_domain_banner_dismissed", "true");
                  } catch {}
                }}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer transition-colors"
                title="Dismiss banner"
                aria-label="Dismiss banner"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------- Add domain form ---------------------------- */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="border-border/60 bg-muted/20 grid gap-3 border-b px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_260px_auto] lg:items-start"
        >
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="custom-domain" className="text-foreground text-xs font-medium">
              Domain name
            </Label>
            <Input
              id="custom-domain"
              placeholder="app.example.com"
              autoComplete="off"
              spellCheck={false}
              disabled={formDisabled}
              className="h-9 font-mono text-[13px]"
              {...register("domain")}
              aria-invalid={!!errors.domain}
            />
            {errors.domain && (
              <p className="text-destructive flex items-center gap-1 text-[11px]">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.domain.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-domain-tunnel" className="text-foreground text-xs font-medium">
              Target tunnel
            </Label>
            <div className="relative">
              <select
                id="custom-domain-tunnel"
                disabled={formDisabled}
                className="border-border/60 bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/40 h-9 w-full cursor-pointer appearance-none rounded-md border pr-8 pl-3 text-[13px] transition-all duration-200 outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register("tunnelId")}
                aria-invalid={!!errors.tunnelId}
              >
                <option value="">Select tunnel…</option>
                {availableTunnels.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.subdomain}.tunl.online{activeSubdomains.has(t.subdomain) ? " ●" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2" />
            </div>
            {errors.tunnelId ? (
              <p className="text-destructive flex items-center gap-1 text-[11px]">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.tunnelId.message}
              </p>
            ) : (
              availableTunnels.length === 0 &&
              tunnels.length > 0 && (
                <p className="text-muted-foreground text-[11px]">
                  Every tunnel already has a domain. Remove one to reuse its tunnel.
                </p>
              )
            )}
          </div>

          <div className="space-y-1.5">
            {/* Spacer keeps the button aligned with the inputs on desktop */}
            <span aria-hidden className="hidden h-4 text-xs lg:block" />
            <Button
              type="submit"
              disabled={createMutation.isPending || availableTunnels.length === 0}
              className="h-9 w-full shrink-0 gap-1.5 px-4 text-[13px] font-semibold whitespace-nowrap lg:w-auto"
              title={
                availableTunnels.length === 0
                  ? "All tunnels already have a custom domain"
                  : "Add domain"
              }
            >
              {createMutation.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Adding…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add domain
                </>
              )}
            </Button>
          </div>
        </form>

        {tunnels.length === 0 && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300 sm:mx-5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Reserve a tunnel subdomain first. Custom domains map 1:1 to your existing tunnels.
          </div>
        )}

        {/* ------------------------------ Domain list ------------------------------ */}
        {customDomainsQuery.isLoading ? (
          <div className="space-y-3 px-4 py-5 sm:px-5">
            {[0, 1].map((i) => (
              <div key={i} className="border-border/60 animate-pulse rounded-lg border p-4">
                <div className="bg-muted mb-2 h-4 w-48 rounded" />
                <div className="bg-muted/70 h-3 w-72 rounded" />
              </div>
            ))}
          </div>
        ) : customDomains.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-14 text-center">
            <div className="border-border/60 bg-muted/30 text-muted-foreground flex h-11 w-11 items-center justify-center rounded-full border">
              <Globe className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-foreground text-sm font-semibold">No custom domains yet</h3>
              <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
                Connect a domain you own (e.g. <code className="font-mono">api.example.com</code>)
                to send traffic straight to your tunnel with automatic SSL.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowIntroDialog(true)}
              className="gap-1.5 text-xs font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>How custom domains work</span>
            </Button>
          </div>
        ) : (
          <div className="divide-border/60 divide-y">
            {customDomains.map((d) => {
              const tunnelOnline = activeSubdomains.has(d.subdomain);
              const live = d.status === "verified" && tunnelOnline;
              const isVerifyingThis = verifyingId === d.id;
              // Unverified domains open by default; verified ones stay collapsed until toggled.
              const isExpanded = expandedDomainIds[d.id] ?? d.status !== "verified";

              return (
                <div key={d.id} className="px-4 py-5 sm:px-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* Domain info */}
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {d.status === "verified" ? (
                          <a
                            href={`https://${d.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:text-primary inline-flex max-w-full items-center gap-1.5 font-mono text-[15px] font-semibold transition-colors hover:underline"
                            title={`Open https://${d.domain}`}
                          >
                            <span className="truncate">{d.domain}</span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          </a>
                        ) : (
                          <span className="text-foreground max-w-full truncate font-mono text-[15px] font-semibold">
                            {d.domain}
                          </span>
                        )}

                        <StatusBadge status={d.status} />

                        {live && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                            Live
                          </span>
                        )}
                      </div>

                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          <ArrowRight className="h-3 w-3 shrink-0" />
                          <span className="text-foreground/80 font-mono">
                            {d.subdomain}.tunl.online
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${tunnelOnline ? "bg-emerald-400" : "bg-muted-foreground/40"
                              }`}
                          />
                          {tunnelOnline ? "Tunnel online" : "Tunnel offline"}
                        </span>
                        {d.lastCheckedAt && (
                          <span>
                            Checked{" "}
                            {formatDistanceToNow(new Date(d.lastCheckedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(d.id, isExpanded)}
                        aria-expanded={isExpanded}
                        className="text-muted-foreground hover:text-foreground gap-1 text-xs whitespace-nowrap"
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
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 text-xs whitespace-nowrap"
                        onClick={() => setDeleteDomain(d)}
                        title="Remove domain"
                        aria-label={`Remove ${d.domain}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
                    </div>
                  </div>

                  {isExpanded && <DnsRecordsPanel domain={d} />}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* --------------------------- Delete confirmation --------------------------- */}
      <AlertDialog
        open={!!deleteDomain}
        onOpenChange={(open) => {
          if (!open) setDeleteDomain(null);
        }}
      >
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

      {/* ------------------------ Feature Intro Dialog ------------------------ */}
      <CustomDomainIntroDialog
        open={showIntroDialog}
        onOpenChange={setShowIntroDialog}
        onGetStarted={() => {
          const input = document.getElementById("custom-domain");
          if (input) {
            input.focus();
            input.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }}
      />
    </>
  );
}