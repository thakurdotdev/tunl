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
  useTunnelSessionsQuery,
  useTunnelsQuery,
} from "@/hooks/use-tunnels";
import { ApiClientError } from "@/lib/api-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar, CheckCircle2, Copy, Eye, Globe, Trash2, Wifi, WifiOff } from "lucide-react";
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
  const { data: profile } = useProfileQuery();
  const { data: tunnels = [], isLoading } = useTunnelsQuery();
  const { data: activeSessions = [] } = useTunnelSessionsQuery();
  const createMutation = useCreateTunnelMutation();
  const deleteMutation = useDeleteTunnelMutation();

  const [deleteTunnelId, setDeleteTunnelId] = useState<string | null>(null);
  const [customPort, setCustomPort] = useState("3000");
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

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

  const copyToClipboard = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied command to clipboard!");
    if (id) {
      setCopiedSnippetId(id);
      setTimeout(() => setCopiedSnippetId(null), 2000);
    }
  };

  const maxTunnels = profile?.plan?.maxReservedSubdomains ?? 1;
  const currentTunnelsCount = tunnels.length;
  const limitReached = currentTunnelsCount >= maxTunnels;

  const subdomainInput = watch("subdomain")?.trim();
  const generatedSshCommand = subdomainInput
    ? `ssh -R 80:localhost:${customPort || "3000"} -p 2222 ${subdomainInput}@t.thakur.dev`
    : `ssh -t -R 80:localhost:${customPort || "3000"} -p 2222 t.thakur.dev`;

  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* Top Header & Stats Counter Bar */}
      <div className="border-border/60 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Tunnels & Subdomains</h1>
          <p className="text-muted-foreground text-xs">
            Manage static endpoints and monitor live HTTP/SSH tunnel sessions.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="border-border/60 bg-card flex items-center gap-2.5 rounded-md border px-3 py-1.5 shadow-2xs">
            <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
              Reserved
            </span>
            <span className="text-foreground font-semibold">
              {currentTunnelsCount} / {maxTunnels}
            </span>
          </div>
          <div className="border-border/60 bg-card flex items-center gap-2.5 rounded-md border px-3 py-1.5 shadow-2xs">
            <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
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
        <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-lg border shadow-2xs lg:col-span-6">
          <div className="border-border/60 bg-muted/40 flex items-center justify-between border-b px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2 font-sans font-medium text-foreground">
              <Globe className="text-primary h-4 w-4" />
              <span>Reserve Subdomain</span>
            </div>
            <span className="text-muted-foreground text-[11px] font-medium">Static Alias</span>
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
                    className="border-border/60 bg-background h-9 rounded-md pr-[110px] pl-3 font-mono text-xs"
                    {...register("subdomain")}
                    aria-invalid={!!errors.subdomain}
                  />
                  <span className="text-muted-foreground pointer-events-none absolute right-3 font-mono text-xs select-none">
                    .thakur.dev
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
                className="h-8 shrink-0 self-start px-4 text-xs font-semibold"
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
        <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-lg border shadow-2xs lg:col-span-6">
          <div className="border-border/60 bg-muted/40 flex items-center justify-between border-b px-4 py-2.5 text-xs font-sans">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-600/60" />
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-600/60" />
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-600/60" />
              <span className="text-muted-foreground ml-1 text-xs font-medium">
                Quick Connect Command
              </span>
            </div>
            <span className="text-muted-foreground text-[11px] font-mono">OpenSSH</span>
          </div>

          <div className="flex flex-1 flex-col justify-between gap-4 p-5">
            <div className="flex items-center justify-between gap-4">
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
                  className="border-border/60 bg-background h-7 rounded px-2 text-center font-mono text-xs"
                />
              </div>
            </div>

            <div className="bg-muted/60 text-foreground border-border/60 flex items-center gap-3 rounded-md border p-3 font-mono text-xs select-all">
              <span className="text-muted-foreground select-none">$</span>
              <code className="flex-1 truncate text-emerald-400 font-semibold">{generatedSshCommand}</code>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => copyToClipboard(generatedSshCommand, "quick_connect")}
                className="shrink-0"
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
      <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-lg border shadow-2xs">
        <div className="border-border/60 bg-muted/40 flex items-center justify-between border-b px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-foreground text-xs font-semibold">Reserved Subdomains</span>
            <span className="bg-secondary text-secondary-foreground border-border/60 rounded-md border px-2 py-0.5 text-[11px] font-semibold">
              {tunnels.length}
            </span>
          </div>
          <span className="text-muted-foreground text-[11px] font-mono">port 2222</span>
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
          <div className="no-scrollbar overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="border-border/60 bg-muted/40 text-muted-foreground border-b text-[11px] font-semibold uppercase tracking-wider">
                  <th className="w-[220px] p-4">Subdomain Endpoint</th>
                  <th className="w-[120px] p-4">State</th>
                  <th className="p-4">SSH Command Snippet</th>
                  <th className="w-[140px] p-4">Created Date</th>
                  <th className="w-[80px] p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {tunnels.map((tunnel) => {
                  const sshCommand = `ssh -R 80:localhost:3000 -p 2222 ${tunnel.subdomain}@t.thakur.dev`;
                  return (
                    <tr
                      key={tunnel.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="text-foreground p-4 font-mono font-semibold">
                        {tunnel.subdomain}.thakur.dev
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                            tunnel.status === "active"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : "bg-muted text-muted-foreground border border-border/60"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              tunnel.status === "active"
                                ? "animate-pulse bg-emerald-400"
                                : "bg-muted-foreground"
                            }`}
                          />
                          {tunnel.status === "active" ? "Active" : "Reserved"}
                        </span>
                      </td>
                      <td className="p-4 font-mono">
                        <div className="flex max-w-[360px] items-center gap-2">
                          <code className="bg-muted/60 text-emerald-400 border-border/60 block flex-1 truncate rounded-md border px-2.5 py-1 text-[11px] select-all">
                            {sshCommand}
                          </code>
                          <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() => copyToClipboard(sshCommand, tunnel.id)}
                            className="shrink-0"
                          >
                            {copiedSnippetId === tunnel.id ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>

                      <td className="text-muted-foreground p-4 text-[11px] whitespace-nowrap font-sans">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(tunnel.createdAt), "MMM d, yyyy")}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="destructive"
                          size="icon-xs"
                          onClick={() => setDeleteTunnelId(tunnel.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Active Sessions Monitor */}
      <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-lg border shadow-2xs">
        <div className="border-border/60 bg-muted/40 flex items-center justify-between border-b px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-foreground text-xs font-semibold">Active Sessions Monitor</span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ${
              activeSessions.length > 0
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                : "bg-muted text-muted-foreground border border-border/60"
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
          <div className="no-scrollbar overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="border-border/60 bg-muted/40 text-muted-foreground border-b text-[11px] font-semibold uppercase tracking-wider">
                  <th className="p-4">Subdomain</th>
                  <th className="p-4">Remote IP</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Connected Time</th>
                  <th className="w-[80px] p-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {activeSessions.map((session) => (
                  <tr
                    key={session.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="text-foreground p-4 font-mono font-semibold">
                      <span className="flex items-center gap-2">
                        <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                        {session.subdomain}.thakur.dev
                      </span>
                    </td>
                    <td className="text-muted-foreground p-4 font-mono text-[11px]">
                      {session.remoteIp || "127.0.0.1"}
                    </td>
                    <td className="p-4">
                      <span className="bg-secondary text-secondary-foreground border-border/60 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase">
                        {session.tunnelId ? "Static" : "Ephemeral"}
                      </span>
                    </td>
                    <td className="text-muted-foreground p-4 text-[11px] font-sans">
                      {formatDistanceToNow(new Date(session.connectedAt), { addSuffix: true })}
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/inspect/${session.subdomain}`}>
                        <Button variant="outline" size="icon-xs">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
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
            <AlertDialogDescription className="text-xs text-muted-foreground">
              This will un-reserve the subdomain alias. Any active tunnel connections using this subdomain will be disconnected immediately.
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
    </div>
  );
}
