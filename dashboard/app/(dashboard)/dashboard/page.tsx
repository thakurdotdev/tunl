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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfileQuery } from "@/hooks/use-auth";
import {
  useCreateTunnelMutation,
  useDeleteTunnelMutation,
  useTunnelsQuery,
  useTunnelSessionsQuery,
} from "@/hooks/use-tunnels";
import { ApiClientError } from "@/lib/api-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow, format } from "date-fns";
import { Calendar, Copy, Globe, Trash2, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const tunnelSchema = z.object({
  subdomain: z
    .string()
    .min(3, "Subdomain must be at least 3 characters")
    .max(63, "Subdomain must be at most 63 characters")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens are allowed"),
});

type TunnelFormValues = z.infer<typeof tunnelSchema>;

export default function TunnelsPage() {
  const { data: profile } = useProfileQuery();
  const { data: tunnels = [], isLoading } = useTunnelsQuery();
  const { data: activeSessions = [] } = useTunnelSessionsQuery();
  const createMutation = useCreateTunnelMutation();
  const deleteMutation = useDeleteTunnelMutation();

  const [deleteTunnelId, setDeleteTunnelId] = useState<string | null>(null);
  const [customPort, setCustomPort] = useState("3000");

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const maxTunnels = profile?.plan?.maxReservedSubdomains ?? 1;
  const currentTunnelsCount = tunnels.length;
  const limitReached = currentTunnelsCount >= maxTunnels;

  const subdomainInput = watch("subdomain")?.trim();
  const sshTargetHost = subdomainInput ? `${subdomainInput}@t.thakur.dev` : "t.thakur.dev";
  const generatedSshCommand = `ssh -R 80:localhost:${customPort || "3000"} -p 2222 ${sshTargetHost}`;

  return (
    <div className="flex flex-col gap-6 font-mono">
      {/* Top Header & Stats Counter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold text-xl">{">"}</span>
            <h1 className="text-xl font-bold tracking-tight">Tunnels & Subdomains</h1>
          </div>
          <p className="text-muted-foreground text-xs mt-0.5">
            // Manage static endpoints and monitor live HTTP/SSH tunnel sessions.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="border-border bg-card flex items-center gap-2 rounded-md border px-3 py-1.5 shadow-2xs">
            <span className="text-muted-foreground text-[10px]">RESERVED</span>
            <span className="text-primary font-bold">{currentTunnelsCount} / {maxTunnels}</span>
          </div>
          <div className="border-border bg-card flex items-center gap-2 rounded-md border px-3 py-1.5 shadow-2xs">
            <span className="text-muted-foreground text-[10px]">LIVE SESSIONS</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {activeSessions.length}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Grid Top Section */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Reservation Form Column */}
        <div className="lg:col-span-6 border-border bg-card overflow-hidden rounded-lg border shadow-xs flex flex-col">
          <div className="border-border bg-muted/40 flex items-center justify-between border-b px-4 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-muted-foreground ml-2 font-mono text-[11px]">
                tunl :: reserve-subdomain
              </span>
            </div>
            <span className="text-muted-foreground text-[10px]">STATIC ALIAS</span>
          </div>

          <div className="p-5 flex flex-col justify-between flex-1 gap-4">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="subdomain" className="text-xs font-semibold text-muted-foreground">
                  TARGET SUBDOMAIN ALIAS
                </Label>
                <div className="relative flex items-center">
                  <span className="text-primary absolute left-3 font-bold text-xs select-none">
                    $
                  </span>
                  <Input
                    id="subdomain"
                    placeholder="my-app"
                    disabled={createMutation.isPending || limitReached}
                    className="pl-7 pr-[105px] font-mono text-xs h-9 bg-background/50 border-border focus-visible:ring-primary/40"
                    {...register("subdomain")}
                    aria-invalid={!!errors.subdomain}
                  />
                  <span className="text-muted-foreground/70 pointer-events-none absolute right-3 font-mono text-xs select-none">
                    .thakur.dev
                  </span>
                </div>
                {errors.subdomain && (
                  <p className="text-destructive text-xs font-mono">{errors.subdomain.message}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={createMutation.isPending || limitReached}
                size="sm"
                className="h-9 shrink-0 font-mono text-xs gap-1.5 self-start"
              >
                {createMutation.isPending ? "Reserving..." : "[+ Reserve Subdomain]"}
              </Button>
            </form>
            {limitReached && (
              <p className="text-xs text-amber-500 font-mono">
                [!] Reservation limit reached. Delete an existing tunnel to claim a new alias.
              </p>
            )}
          </div>
        </div>

        {/* Quick Connect Command Preview Box */}
        <div className="lg:col-span-6 border-border bg-card overflow-hidden rounded-lg border shadow-xs flex flex-col">
          <div className="border-border bg-muted/40 flex items-center justify-between border-b px-4 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-muted-foreground ml-2 font-mono text-[11px]">
                tunl :: quick-connect-cli
              </span>
            </div>
            <span className="text-primary font-bold text-[10px]">OPENSSH</span>
          </div>

          <div className="p-5 flex flex-col justify-between flex-1 gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground">GENERATED SSH COMMAND</span>
                <p className="text-muted-foreground text-[11px]">
                  Forward local port {customPort || "3000"} to the internet:
                </p>
              </div>
              <div className="flex flex-col gap-1 shrink-0 w-24">
                <Label htmlFor="quickPort" className="text-[10px] font-semibold text-muted-foreground">
                  LOCAL PORT
                </Label>
                <Input
                  id="quickPort"
                  value={customPort}
                  onChange={(e) => setCustomPort(e.target.value)}
                  placeholder="3000"
                  className="h-7 text-xs font-mono bg-background/50 border-border px-2 text-center"
                />
              </div>
            </div>

            <div className="bg-muted/80 text-primary border-border flex items-center gap-3 rounded-md border p-3 font-mono text-xs select-all">
              <span className="text-muted-foreground select-none">$</span>
              <code className="flex-1 truncate">{generatedSshCommand}</code>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => copyToClipboard(generatedSshCommand)}
                className="shrink-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>


      {/* Reserved Tunnels List Window */}
      <div className="border-border bg-card overflow-hidden rounded-lg border shadow-sm">
        <div className="border-border bg-muted/40 flex items-center justify-between border-b px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
            <span className="text-muted-foreground ml-2 font-mono text-[11px]">
              tunl :: reserved-subdomains [{tunnels.length}]
            </span>
          </div>
          <span className="text-muted-foreground text-[10px]">PORT 2222</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <div className="border-primary/20 border-t-primary h-5 w-5 animate-spin rounded-full border-2" />
            <p className="text-muted-foreground text-xs font-mono">Loading subdomains...</p>
          </div>
        ) : tunnels.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
            <Globe className="text-muted-foreground/30 h-8 w-8" />
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold">No subdomains reserved</h3>
              <p className="text-muted-foreground max-w-sm text-xs">
                Reserve a subdomain above to enable static tunneling endpoints.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="border-border bg-muted/20 border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="p-3.5 font-semibold">Subdomain Endpoint</th>
                  <th className="p-3.5 font-semibold">State</th>
                  <th className="p-3.5 font-semibold">SSH Command Snippet</th>
                  <th className="p-3.5 font-semibold">Created Date</th>
                  <th className="p-3.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {tunnels.map((tunnel) => {
                  const sshCommand = `ssh -R 80:localhost:3000 -p 2222 ${tunnel.subdomain}@t.thakur.dev`;
                  return (
                    <tr
                      key={tunnel.id}
                      className="border-border hover:bg-muted/15 border-b transition-colors last:border-0"
                    >
                      <td className="text-foreground p-3.5 font-bold">
                        {tunnel.subdomain}.thakur.dev
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            tunnel.status === "active"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              tunnel.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"
                            }`}
                          />
                          {tunnel.status === "active" ? "ACTIVE" : "RESERVED"}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex max-w-[340px] items-center gap-2">
                          <code className="bg-muted/70 text-primary border-border block flex-1 truncate overflow-x-auto rounded-md border p-1.5 font-mono text-[11px] select-all">
                            {sshCommand}
                          </code>
                          <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() => copyToClipboard(sshCommand)}
                            className="shrink-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="text-muted-foreground p-3.5 whitespace-nowrap text-[11px]">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(tunnel.createdAt), "MMM d, yyyy")}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          variant="destructive"
                          size="icon-xs"
                          onClick={() => setDeleteTunnelId(tunnel.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Live Sessions Monitor */}
      <div className="border-border bg-card overflow-hidden rounded-lg border shadow-sm">
        <div className="border-border bg-muted/40 flex items-center justify-between border-b px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
            <span className="text-muted-foreground ml-2 font-mono text-[11px]">
              tunl :: active-sessions-monitor
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
              activeSessions.length > 0
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                activeSessions.length > 0 ? "animate-pulse bg-emerald-400" : "bg-muted-foreground"
              }`}
            />
            {activeSessions.length} LIVE
          </span>
        </div>

        {activeSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
            <WifiOff className="text-muted-foreground/30 h-7 w-7" />
            <p className="text-muted-foreground text-xs font-mono">// No active tunnel sessions currently established</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="border-border bg-muted/20 border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="p-3.5 font-semibold">Endpoint</th>
                  <th className="p-3.5 font-semibold">Client IP</th>
                  <th className="p-3.5 font-semibold">Uptime</th>
                  <th className="p-3.5 font-semibold">Type</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((session) => (
                  <tr
                    key={session.id}
                    className="border-border hover:bg-muted/15 border-b transition-colors last:border-0"
                  >
                    <td className="p-3.5">
                      <span className="flex items-center gap-2">
                        <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-400 animate-pulse" />
                        <span className="text-foreground font-bold">
                          {session.subdomain}.thakur.dev
                        </span>
                      </span>
                    </td>
                    <td className="text-muted-foreground p-3.5 font-mono text-[11px]">
                      {session.remoteIp || "—"}
                    </td>
                    <td className="text-muted-foreground p-3.5 text-[11px] whitespace-nowrap">
                      {formatDistanceToNow(new Date(session.connectedAt), { addSuffix: true })}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          session.tunnelId
                            ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {session.tunnelId ? "STATIC" : "EPHEMERAL"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTunnelId}>
        <AlertDialogContent className="font-mono">
          <AlertDialogHeader>
            <AlertDialogTitle>[!] TERMINATE RESERVED SUBDOMAIN?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently delete the reserved subdomain and close any active SSH connections bound to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTunnelId(null)} className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
            >
              [Delete]
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


