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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import CustomDomainsCard from "@/components/custom-domains-card";
import {
  useCreateTunnelMutation,
  useDeleteTunnelMutation,
  useTunnelSessionsQuery,
  useTunnelsQuery,
  useUpdateTunnelPasswordMutation,
} from "@/hooks/use-tunnels";
import { ApiClientError } from "@/lib/api-client";
import { type Tunnel } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import {
  BarChart3,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Lock,
  ShieldCheck,
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

export default function TunnelsPage() {
  const { user } = useAuth();
  const { data: tunnels = [], isLoading } = useTunnelsQuery();
  const { data: activeSessions = [], isLoading: isSessionsLoading } = useTunnelSessionsQuery();
  const createMutation = useCreateTunnelMutation();
  const deleteMutation = useDeleteTunnelMutation();

  const [deleteTunnelId, setDeleteTunnelId] = useState<string | null>(null);
  const [passwordTunnel, setPasswordTunnel] = useState<Tunnel | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [customPort, setCustomPort] = useState("3000");
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  const updatePasswordMutation = useUpdateTunnelPasswordMutation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TunnelFormValues>({
    resolver: zodResolver(tunnelSchema),
    defaultValues: {
      subdomain: "",
    },
  });

  const onSubmit = (values: TunnelFormValues) => {
    createMutation.mutate(values.subdomain, {
      onSuccess: () => {
        toast.success("Subdomain reserved successfully!");
        reset();
      },
      onError: (err) => {
        if (err instanceof ApiClientError) {
          toast.error(err.message);
        } else {
          toast.error("Failed to reserve subdomain.");
        }
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTunnelId) return;
    deleteMutation.mutate(deleteTunnelId, {
      onSuccess: () => {
        toast.success("Tunnel deleted successfully!");
        setDeleteTunnelId(null);
      },
      onError: (err) => {
        if (err instanceof ApiClientError) {
          toast.error(err.message);
        } else {
          toast.error("Failed to delete tunnel.");
        }
        setDeleteTunnelId(null);
      },
    });
  };

  const handleSavePassword = () => {
    if (!passwordTunnel) return;
    if (passwordValue.trim().length < 4) {
      toast.error("Password must be at least 4 characters.");
      return;
    }
    updatePasswordMutation.mutate(
      { id: passwordTunnel.id, password: passwordValue.trim() },
      {
        onSuccess: () => {
          toast.success(`Password set for ${passwordTunnel.subdomain}.tunl.online`);
          setPasswordTunnel(null);
          setPasswordValue("");
        },
        onError: (err) => {
          if (err instanceof ApiClientError) {
            toast.error(err.message);
          } else {
            toast.error("Failed to set password.");
          }
        },
      },
    );
  };

  const handleRemovePassword = () => {
    if (!passwordTunnel) return;
    updatePasswordMutation.mutate(
      { id: passwordTunnel.id, password: null },
      {
        onSuccess: () => {
          toast.success(`Password removed from ${passwordTunnel.subdomain}.tunl.online`);
          setPasswordTunnel(null);
          setPasswordValue("");
        },
        onError: (err) => {
          if (err instanceof ApiClientError) {
            toast.error(err.message);
          } else {
            toast.error("Failed to remove password.");
          }
        },
      },
    );
  };

  const copyToClipboard = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied command to clipboard!");
    if (id) {
      setCopiedSnippetId(id);
      setTimeout(() => setCopiedSnippetId(null), 2000);
    }
  };

  const maxTunnels = user?.plan?.maxReservedSubdomains ?? 1;
  const currentTunnelsCount = tunnels.length;
  const limitReached = currentTunnelsCount >= maxTunnels;

  const subdomainInput = watch("subdomain")?.trim();
  const generatedSshCommand = subdomainInput
    ? `ssh -R 80:localhost:${customPort || "3000"} -p 2222 ${subdomainInput}@tunl.online`
    : `ssh -t -R 80:localhost:${customPort || "3000"} -p 2222 tunl.online`;

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Page title and live status */}
      <div className="border-border/60 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Tunnels & subdomains
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="border-border/60 bg-card flex items-center gap-2 rounded-lg border px-3 py-1.5 shadow-2xs">
            <Globe className="text-muted-foreground/70 h-3.5 w-3.5" />
            <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
              Reserved
            </span>
            <span className="text-foreground font-semibold">
              {currentTunnelsCount} / {maxTunnels}
            </span>
          </div>
          <div className="border-border/60 bg-card flex items-center gap-2 rounded-lg border px-3 py-1.5 shadow-2xs">
            <Wifi className="text-muted-foreground/70 h-3.5 w-3.5" />
            <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
              Live Sessions
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {activeSessions.length}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Grid Top Section */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Reservation Form Column */}
        <Card className="gap-0 rounded-xl p-0 shadow-none lg:col-span-6">
          <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-4 py-3 text-xs">
            <div className="text-foreground flex items-center gap-2 font-medium">
              <Globe className="text-primary h-4 w-4" />
              <h2 className="font-semibold">Reserve subdomain</h2>
            </div>
          </div>

          <div className="p-5">
            {limitReached ? (
              <div className="flex min-h-20 flex-col justify-center">
                <div>
                  <p className="text-foreground text-sm font-medium">Endpoint limit reached</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Your plan allows {maxTunnels} reserved subdomain{maxTunnels === 1 ? "" : "s"}.
                    Revoke one below to add another.
                  </p>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor="subdomain" className="text-foreground text-xs font-medium">
                    Subdomain name
                  </Label>
                  <div className="relative flex items-center">
                    <Input
                      id="subdomain"
                      placeholder="my-app"
                      disabled={createMutation.isPending}
                      className="bg-background h-10 rounded-md pr-28 pl-3 font-mono text-sm"
                      {...register("subdomain")}
                      aria-invalid={!!errors.subdomain}
                    />
                    <span className="text-muted-foreground pointer-events-none absolute right-3 font-mono text-xs select-none">
                      .tunl.online
                    </span>
                  </div>
                  {errors.subdomain && (
                    <p className="text-destructive text-xs">{errors.subdomain.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  size="lg"
                  className="h-10 shrink-0 px-4 text-sm font-semibold"
                >
                  {createMutation.isPending ? "Reserving..." : "Reserve subdomain"}
                </Button>
              </form>
            )}
          </div>
        </Card>

        {/* Quick Connect Command Preview Box */}
        <Card className="gap-0 rounded-xl p-0 shadow-none lg:col-span-6">
          <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-4 py-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-foreground text-xs font-semibold">Quick connect</span>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between gap-4 p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">
                  Forward a local port through your tunnel.
                </span>
              </div>
              <div className="flex w-24 shrink-0 flex-col gap-1">
                <Label
                  htmlFor="quickPort"
                  className="text-muted-foreground text-[11px] font-medium"
                >
                  Local port
                </Label>
                <Input
                  id="quickPort"
                  type="number"
                  min={1}
                  max={65535}
                  value={customPort}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", "."].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setCustomPort(val);
                  }}
                  placeholder="3000"
                  className="border-border/60 bg-background h-7.5 rounded-md px-2 text-center font-mono text-xs"
                />
              </div>
            </div>

            <div className="bg-muted/40 text-foreground border-border/60 flex items-center gap-3 rounded-lg border p-3 font-mono text-xs select-all">
              <span className="text-muted-foreground select-none">$</span>
              <code className="flex-1 truncate font-medium text-emerald-400">
                {generatedSshCommand}
              </code>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => copyToClipboard(generatedSshCommand, "quick_connect")}
                className="border-border/60 h-7 w-7 shrink-0"
                title="Copy Command"
              >
                {copiedSnippetId === "quick_connect" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Reserved Tunnels List Window */}
      <Card className="gap-0 rounded-xl p-0 shadow-none">
        <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-foreground text-sm font-semibold">Endpoints</h2>
            </div>
            <span className="bg-secondary/80 text-secondary-foreground border-border/60 rounded-md border px-2 py-0.5 text-[11px] font-semibold">
              {tunnels.length}
            </span>
          </div>
          <span className="text-muted-foreground font-mono text-[11px]">
            SSH Gateway: port 2222
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14">
            <div className="border-primary/20 border-t-primary h-5 w-5 animate-spin rounded-full border-2" />
            <p className="text-muted-foreground text-xs">Loading subdomains...</p>
          </div>
        ) : tunnels.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
            <Globe className="text-muted-foreground/30 h-8 w-8" />
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold">No subdomains reserved</h3>
              <p className="text-muted-foreground max-w-sm text-xs">
                Reserve a subdomain to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-border/60 divide-y">
            {tunnels.map((tunnel) => {
              const sshCommand = `ssh -R 80:localhost:3000 -p 2222 ${tunnel.subdomain}@tunl.online`;
              const tunnelSessions = activeSessions.filter(
                (session) => session.subdomain === tunnel.subdomain,
              );
              const isActive = tunnelSessions.length > 0;
              const oldestSession = tunnelSessions.length
                ? tunnelSessions.reduce((oldest, session) =>
                    new Date(session.connectedAt).getTime() < new Date(oldest.connectedAt).getTime()
                      ? session
                      : oldest,
                  )
                : null;
              const connectionSummary = oldestSession
                ? `${tunnelSessions.length} active session${tunnelSessions.length === 1 ? "" : "s"} · connected ${formatDistanceToNow(new Date(oldestSession.connectedAt), { addSuffix: true })}${oldestSession.remoteIp ? ` · IP ${oldestSession.remoteIp}` : ""}`
                : isSessionsLoading
                  ? "Checking connection…"
                  : tunnel.lastConnectedAt
                    ? `Last connected ${formatDistanceToNow(new Date(tunnel.lastConnectedAt), { addSuffix: true })}`
                    : "Never connected";
              return (
                <div
                  key={tunnel.id}
                  className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(220px,1fr)_minmax(260px,340px)_auto] xl:items-center xl:px-5"
                >
                  {/* Subdomain */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <a
                        href={`https://${tunnel.subdomain}.tunl.online`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground hover:text-primary inline-flex items-center gap-1.5 font-mono text-sm font-semibold"
                      >
                        {tunnel.subdomain}.tunl.online
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          isActive
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : "border-border/50 bg-secondary/60 text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${isActive ? "animate-pulse bg-emerald-400" : "bg-muted-foreground/60"}`}
                        />
                        {isActive ? "Live" : "Reserved"}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      {tunnel.hasPassword || tunnel.password ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordTunnel(tunnel);
                            setPasswordValue("");
                          }}
                          className="inline-flex cursor-pointer items-center gap-1.5 text-amber-400 transition-colors hover:text-amber-300"
                          title="Click to manage password"
                        >
                          <Lock className="h-3 w-3" />
                          Protected
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordTunnel(tunnel);
                            setPasswordValue("");
                          }}
                          className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 transition-colors"
                          title="Click to set password"
                        >
                          <Unlock className="h-3 w-3" />
                          Public
                        </button>
                      )}
                      <span className={isActive ? "text-emerald-400" : ""}>
                        {connectionSummary}
                      </span>
                    </div>
                  </div>

                  {/* SSH Snippet */}
                  <div className="border-border/60 bg-background flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 font-mono">
                    <code className="text-muted-foreground min-w-0 flex-1 truncate text-xs select-all">
                      {sshCommand}
                    </code>
                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={() => copyToClipboard(sshCommand, tunnel.id)}
                      className="h-7 w-7 shrink-0"
                      aria-label="Copy SSH command"
                    >
                      {copiedSnippetId === tunnel.id ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5 xl:pl-1">
                    <Button
                      nativeButton={false}
                      render={<Link href={`/inspect/${tunnel.subdomain}/analytics`} />}
                      size="sm"
                      variant="outline"
                      className="whitespace-nowrap"
                    >
                      <BarChart3 className="h-3.5 w-3.5" /> Analytics
                    </Button>
                    <Button
                      nativeButton={false}
                      render={<Link href={`/inspect/${tunnel.subdomain}`} />}
                      size="sm"
                      className="whitespace-nowrap"
                    >
                      <Eye className="h-3.5 w-3.5" /> Inspect
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive whitespace-nowrap"
                      onClick={() => setDeleteTunnelId(tunnel.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Revoke
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <CustomDomainsCard />

      {/* Delete Modal */}
      <AlertDialog open={!!deleteTunnelId}>
        <AlertDialogContent className="font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Subdomain Alias?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs">
              This will un-reserve the subdomain alias. Any active tunnel connections using this
              subdomain will be disconnected immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTunnelId(null)} className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
            >
              Revoke Subdomain
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Protection Dialog */}
      <Dialog open={!!passwordTunnel} onOpenChange={(open) => !open && setPasswordTunnel(null)}>
        <DialogContent className="font-sans sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold">
                  Tunnel Password Protection
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-mono text-xs">
                  {passwordTunnel?.subdomain}.tunl.online
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2 text-xs">
            {passwordTunnel?.hasPassword || passwordTunnel?.password ? (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-300">
                <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  This tunnel is currently password-protected. Visitors must enter HTTP Basic Auth
                  credentials to access it.
                </span>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Set an edge password to protect your tunnel. Visitors will be prompted for Basic
                Auth before requests reach your local server.
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tunnel-password" className="text-xs">
                {passwordTunnel?.hasPassword || passwordTunnel?.password
                  ? "Change Password"
                  : "Password"}
              </Label>
              <Input
                id="tunnel-password"
                type="password"
                placeholder="Enter password (min 4 chars)"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {passwordTunnel?.hasPassword || passwordTunnel?.password ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemovePassword}
                disabled={updatePasswordMutation.isPending}
                className="text-xs"
              >
                Remove Password
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPasswordTunnel(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSavePassword}
                disabled={updatePasswordMutation.isPending || passwordValue.trim().length < 4}
                className="text-xs"
              >
                {updatePasswordMutation.isPending ? "Saving..." : "Save Password"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
