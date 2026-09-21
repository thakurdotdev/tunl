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
import { format, formatDistanceToNow } from "date-fns";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  KeyRound,
  Lock,
  MoreHorizontal,
  ShieldCheck,
  Trash2,
  Unlock,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const { data: activeSessions = [] } = useTunnelSessionsQuery();
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
    <div className="flex flex-col gap-8 font-sans">
      {/* Top Header & Stats Counter Bar */}
      <div className="border-border/60 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-xl font-bold tracking-tight">Tunnels & Subdomains</h1>
          <p className="text-muted-foreground text-xs">
            Manage static endpoints, configure security passwords, and inspect live HTTP/SSH tunnel telemetry.
          </p>
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
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Reservation Form Column */}
        <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-xl border shadow-2xs lg:col-span-6">
          <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-4 py-3 text-xs">
            <div className="text-foreground flex items-center gap-2 font-medium">
              <Globe className="text-primary h-4 w-4" />
              <span className="font-semibold">Reserve Subdomain</span>
            </div>
            <span className="text-muted-foreground bg-secondary/70 border-border/50 rounded-full border px-2 py-0.5 text-[10px] font-medium">
              Static Alias
            </span>
          </div>

          <div className="flex flex-1 flex-col justify-between gap-5 p-5">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="subdomain" className="text-foreground text-xs font-medium">
                  Subdomain Alias
                </Label>
                <div className="relative flex items-center">
                  <Input
                    id="subdomain"
                    placeholder="my-app"
                    disabled={createMutation.isPending || limitReached}
                    className="border-border/60 bg-background h-9 rounded-lg pr-28 pl-3 font-mono text-xs focus:ring-primary/30"
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
                disabled={createMutation.isPending || limitReached}
                size="sm"
                className="h-8.5 shrink-0 self-start px-4 text-xs font-semibold shadow-xs"
              >
                {createMutation.isPending ? "Reserving..." : "Reserve Subdomain"}
              </Button>
            </form>
            {limitReached && (
              <p className="text-xs text-amber-400">
                Reservation limit reached. Revoke an existing subdomain to reserve a new alias.
              </p>
            )}
          </div>
        </div>

        {/* Quick Connect Command Preview Box */}
        <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-xl border shadow-2xs lg:col-span-6">
          <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-4 py-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500/40" />
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500/40" />
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500/40" />
              </div>
              <span className="text-foreground ml-1 text-xs font-semibold">
                Quick Connect Command
              </span>
            </div>
            <span className="text-muted-foreground bg-secondary/70 border-border/50 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium">
              OpenSSH
            </span>
          </div>

          <div className="flex flex-1 flex-col justify-between gap-4 p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-col gap-0.5">
                <span className="text-foreground text-xs font-medium">Generated SSH Command</span>
                <p className="text-muted-foreground text-xs">
                  Forward local port {customPort || "3000"} to the internet:
                </p>
              </div>
              <div className="flex w-24 shrink-0 flex-col gap-1">
                <Label
                  htmlFor="quickPort"
                  className="text-muted-foreground text-[11px] font-medium"
                >
                  Local Port
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
        </div>
      </div>

      {/* Reserved Tunnels List Window */}
      <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-xl border shadow-2xs">
        <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-foreground text-xs font-semibold">Reserved Subdomains</span>
            <span className="bg-secondary/80 text-secondary-foreground border-border/60 rounded-md border px-2 py-0.5 text-[11px] font-semibold">
              {tunnels.length}
            </span>
          </div>
          <span className="text-muted-foreground font-mono text-[11px]">SSH Gateway: port 2222</span>
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
                Reserve a subdomain above to create static tunnel endpoints.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-sans text-xs">
              <thead>
                <tr className="border-border/60 bg-muted/30 text-muted-foreground border-b text-[11px] font-semibold tracking-wider uppercase">
                  <th className="p-4">Subdomain Endpoint</th>
                  <th className="p-4">State</th>
                  <th className="p-4">Security</th>
                  <th className="p-4">SSH Command Snippet</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right w-12">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border/50 divide-y">
                {tunnels.map((tunnel) => {
                  const sshCommand = `ssh -R 80:localhost:3000 -p 2222 ${tunnel.subdomain}@tunl.online`;
                  return (
                    <tr key={tunnel.id} className="hover:bg-muted/20 transition-colors">
                      {/* Subdomain */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                          <span className="text-foreground">{tunnel.subdomain}.tunl.online</span>
                          <a
                            href={`https://${tunnel.subdomain}.tunl.online`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground/40 hover:text-foreground transition-colors p-0.5"
                            title={`Open https://${tunnel.subdomain}.tunl.online`}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </td>

                      {/* State */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            tunnel.status === "active"
                              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : "border-border/50 bg-secondary/60 text-muted-foreground border"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              tunnel.status === "active"
                                ? "animate-pulse bg-emerald-400"
                                : "bg-muted-foreground/60"
                            }`}
                          />
                          {tunnel.status === "active" ? "Live" : "Reserved"}
                        </span>
                      </td>

                      {/* Security */}
                      <td className="p-4">
                        {tunnel.hasPassword || tunnel.password ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPasswordTunnel(tunnel);
                              setPasswordValue("");
                            }}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
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
                            className="text-muted-foreground/50 hover:text-foreground inline-flex cursor-pointer items-center gap-1 text-[11px] transition-colors"
                            title="Click to set password"
                          >
                            <Unlock className="h-3 w-3 text-muted-foreground/40" />
                            Public
                          </button>
                        )}
                      </td>

                      {/* SSH Snippet */}
                      <td className="p-4 font-mono">
                        <div className="flex max-w-[280px] items-center gap-2">
                          <code className="bg-muted/50 border-border/60 block flex-1 truncate rounded-md border px-2.5 py-1 text-[11px] font-medium text-emerald-400 select-all">
                            {sshCommand}
                          </code>
                          <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() => copyToClipboard(sshCommand, tunnel.id)}
                            className="border-border/60 h-7 w-7 shrink-0"
                            title="Copy SSH Command"
                          >
                            {copiedSnippetId === tunnel.id ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="text-muted-foreground p-4 font-sans text-xs whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 opacity-70" />
                          {format(new Date(tunnel.createdAt), "MMM d, yyyy")}
                        </span>
                      </td>

                      {/* Actions Menu */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                  aria-label="Subdomain actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-52 font-sans text-xs">
                              <Link href={`/inspect/${tunnel.subdomain}/analytics`}>
                                <DropdownMenuItem className="cursor-pointer gap-2 py-2">
                                  <BarChart3 className="text-primary h-4 w-4" />
                                  <div className="flex flex-col">
                                    <span className="font-medium text-foreground">Analytics</span>
                                    <span className="text-muted-foreground text-[10px]">
                                      Traffic & bandwidth telemetry
                                    </span>
                                  </div>
                                </DropdownMenuItem>
                              </Link>

                              <Link href={`/inspect/${tunnel.subdomain}`}>
                                <DropdownMenuItem className="cursor-pointer gap-2 py-2">
                                  <Eye className="text-muted-foreground h-4 w-4" />
                                  <div className="flex flex-col">
                                    <span className="font-medium text-foreground">Inspect Traffic</span>
                                    <span className="text-muted-foreground text-[10px]">
                                      Real-time HTTP requests
                                    </span>
                                  </div>
                                </DropdownMenuItem>
                              </Link>

                              <a
                                href={`https://${tunnel.subdomain}.tunl.online`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <DropdownMenuItem className="cursor-pointer gap-2 py-1.5">
                                  <ExternalLink className="text-muted-foreground h-4 w-4" />
                                  <span>Open in Browser</span>
                                </DropdownMenuItem>
                              </a>

                              <DropdownMenuItem
                                className="cursor-pointer gap-2 py-1.5"
                                onClick={() => copyToClipboard(sshCommand, tunnel.id)}
                              >
                                <Copy className="text-muted-foreground h-4 w-4" />
                                <span>Copy SSH Command</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="cursor-pointer gap-2 py-1.5"
                                onClick={() => {
                                  setPasswordTunnel(tunnel);
                                  setPasswordValue("");
                                }}
                              >
                                {tunnel.hasPassword || tunnel.password ? (
                                  <>
                                    <KeyRound className="text-amber-400 h-4 w-4" />
                                    <span>Change Password</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="text-muted-foreground h-4 w-4" />
                                    <span>Set Password Protection</span>
                                  </>
                                )}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                variant="destructive"
                                className="cursor-pointer gap-2 py-1.5"
                                onClick={() => setDeleteTunnelId(tunnel.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Revoke Subdomain</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Sessions Monitor */}
      <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-xl border shadow-2xs">
        <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-foreground text-xs font-semibold">Active Sessions Monitor</span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${
              activeSessions.length > 0
                ? "border border-emerald-500/20 bg-emerald-500/15 text-emerald-400"
                : "border-border/60 bg-muted text-muted-foreground border"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                activeSessions.length > 0 ? "animate-pulse bg-emerald-400" : "bg-muted-foreground"
              }`}
            />
            {activeSessions.length} Live
          </span>
        </div>

        {activeSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
            <WifiOff className="text-muted-foreground/30 h-8 w-8" />
            <p className="text-muted-foreground text-xs">
              No active SSH tunnel connections established.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-sans text-xs">
              <thead>
                <tr className="border-border/60 bg-muted/30 text-muted-foreground border-b text-[11px] font-semibold tracking-wider uppercase">
                  <th className="p-4">Subdomain</th>
                  <th className="p-4">Remote IP</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Connected Time</th>
                  <th className="p-4 text-right w-12">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border/50 divide-y">
                {activeSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-mono font-semibold text-foreground">
                      <span className="flex items-center gap-2">
                        <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                        {session.subdomain}.tunl.online
                      </span>
                    </td>
                    <td className="text-muted-foreground p-4 font-mono text-[11px]">
                      {session.remoteIp || "127.0.0.1"}
                    </td>
                    <td className="p-4">
                      <span className="bg-secondary/70 text-secondary-foreground border-border/50 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase">
                        {session.tunnelId ? "Static" : "Ephemeral"}
                      </span>
                    </td>
                    <td className="text-muted-foreground p-4 font-sans text-xs">
                      {formatDistanceToNow(new Date(session.connectedAt), { addSuffix: true })}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                aria-label="Session actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="w-48 font-sans text-xs">
                            <Link href={`/inspect/${session.subdomain}/analytics`}>
                              <DropdownMenuItem className="cursor-pointer gap-2 py-1.5">
                                <BarChart3 className="text-primary h-4 w-4" />
                                <span>View Analytics</span>
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/inspect/${session.subdomain}`}>
                              <DropdownMenuItem className="cursor-pointer gap-2 py-1.5">
                                <Eye className="text-muted-foreground h-4 w-4" />
                                <span>Inspect Traffic</span>
                              </DropdownMenuItem>
                            </Link>
                            <a
                              href={`https://${session.subdomain}.tunl.online`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <DropdownMenuItem className="cursor-pointer gap-2 py-1.5">
                                <ExternalLink className="text-muted-foreground h-4 w-4" />
                                <span>Open in Browser</span>
                              </DropdownMenuItem>
                            </a>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
