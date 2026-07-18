"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTunnelsQuery, useCreateTunnelMutation, useDeleteTunnelMutation } from "@/hooks/use-tunnels";
import { useProfileQuery } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { useState } from "react";
import { ApiClientError } from "@/lib/api-client";
import { Copy, Trash2, Globe, Calendar, Terminal } from "lucide-react";
import { format } from "date-fns";

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
  const createMutation = useCreateTunnelMutation();
  const deleteMutation = useDeleteTunnelMutation();

  const [deleteTunnelId, setDeleteTunnelId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tunnels</h1>
          <p className="text-sm text-muted-foreground">
            Reserve subdomains and view connectivity status.
          </p>
        </div>
        <div className="text-sm font-medium border border-border bg-card px-3 py-1.5 rounded-xl self-start sm:self-center">
          Plan Limit: {currentTunnelsCount} / {maxTunnels} reserved
        </div>
      </div>

      <div className="border border-border bg-card p-6 rounded-2xl flex flex-col gap-4">
        <h2 className="text-lg font-medium">Reserve Subdomain</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 flex flex-col gap-2">
            <Label htmlFor="subdomain">Subdomain</Label>
            <div className="relative flex items-center">
              <Input
                id="subdomain"
                placeholder="my-app"
                disabled={createMutation.isPending || limitReached}
                className="pr-[100px]"
                {...register("subdomain")}
                aria-invalid={!!errors.subdomain}
              />
              <span className="absolute right-3 text-sm text-muted-foreground pointer-events-none select-none font-mono">
                .thakur.dev
              </span>
            </div>
            {errors.subdomain && (
              <p className="text-xs text-destructive">{errors.subdomain.message}</p>
            )}
          </div>
          <Button
            type="submit"
            disabled={createMutation.isPending || limitReached}
            className="h-8 shrink-0"
          >
            {createMutation.isPending ? "Reserving..." : "Reserve"}
          </Button>
        </form>
        {limitReached && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            You have reached the reservation limit for your plan. Delete an existing tunnel to reserve a new one.
          </p>
        )}
      </div>

      <div className="border border-border bg-card rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
            <p className="text-sm text-muted-foreground">Loading tunnels...</p>
          </div>
        ) : tunnels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
            <Globe className="h-10 w-10 text-muted-foreground/50" />
            <div className="flex flex-col gap-1">
              <h3 className="font-medium text-base">No subdomains reserved</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Reserve your first subdomain above to expose your local port via SSH.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-4 font-medium text-muted-foreground">Subdomain</th>
                  <th className="p-4 font-medium text-muted-foreground">Status</th>
                  <th className="p-4 font-medium text-muted-foreground">Connection Details</th>
                  <th className="p-4 font-medium text-muted-foreground">Created</th>
                  <th className="p-4 font-medium text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tunnels.map((tunnel) => {
                  const sshCommand = `ssh -R 80:localhost:3000 ${tunnel.subdomain}@thakur.dev`;
                  return (
                    <tr key={tunnel.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="p-4 font-medium font-mono text-foreground">
                        {tunnel.subdomain}.thakur.dev
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                            tunnel.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
                              : "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-400 dark:border-zinc-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              tunnel.status === "active" ? "bg-emerald-500" : "bg-zinc-400"
                            }`}
                          />
                          {tunnel.status === "active" ? "Active" : "Reserved"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 max-w-[320px]">
                          <code className="text-xs bg-muted/65 p-2 rounded-xl block font-mono overflow-x-auto truncate flex-1 select-all">
                            {sshCommand}
                          </code>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => copyToClipboard(sshCommand)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(tunnel.createdAt), "MMM d, yyyy")}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="destructive"
                          size="icon-sm"
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

      <AlertDialog open={!!deleteTunnelId}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the reserved subdomain and terminate any active SSH session
              associated with it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTunnelId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
