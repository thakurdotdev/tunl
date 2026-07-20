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
} from "@/hooks/use-tunnels";
import { ApiClientError } from "@/lib/api-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar, Copy, Globe, Trash2 } from "lucide-react";
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
          <p className="text-muted-foreground text-sm">
            Reserve subdomains and view connectivity status.
          </p>
        </div>
        <div className="border-border bg-card self-start rounded-xl border px-3 py-1.5 text-sm font-medium sm:self-center">
          Plan Limit: {currentTunnelsCount} / {maxTunnels} reserved
        </div>
      </div>

      <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6">
        <h2 className="text-lg font-medium">Reserve Subdomain</h2>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-2">
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
              <span className="text-muted-foreground pointer-events-none absolute right-3 font-mono text-sm select-none">
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
            className="h-8 shrink-0"
          >
            {createMutation.isPending ? "Reserving..." : "Reserve"}
          </Button>
        </form>
        {limitReached && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            You have reached the reservation limit for your plan. Delete an existing tunnel to
            reserve a new one.
          </p>
        )}
      </div>

      <div className="border-border bg-card overflow-hidden rounded-2xl border">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <div className="border-foreground/20 border-t-foreground h-5 w-5 animate-spin rounded-full border-2" />
            <p className="text-muted-foreground text-sm">Loading tunnels...</p>
          </div>
        ) : tunnels.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
            <Globe className="text-muted-foreground/50 h-10 w-10" />
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-medium">No subdomains reserved</h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                Reserve your first subdomain above to expose your local port via SSH.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-border bg-muted/30 border-b">
                  <th className="text-muted-foreground p-4 font-medium">Subdomain</th>
                  <th className="text-muted-foreground p-4 font-medium">Status</th>
                  <th className="text-muted-foreground p-4 font-medium">Connection Details</th>
                  <th className="text-muted-foreground p-4 font-medium">Created</th>
                  <th className="text-muted-foreground p-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tunnels.map((tunnel) => {
                  const sshCommand = `ssh -R 80:localhost:3000 -p 2222 ${tunnel.subdomain}@t.thakur.dev`;
                  return (
                    <tr
                      key={tunnel.id}
                      className="border-border hover:bg-muted/10 border-b transition-colors last:border-0"
                    >
                      <td className="text-foreground p-4 font-mono font-medium">
                        {tunnel.subdomain}.thakur.dev
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${
                            tunnel.status === "active"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                              : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400"
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
                        <div className="flex max-w-[320px] items-center gap-2">
                          <code className="bg-muted/65 block flex-1 truncate overflow-x-auto rounded-xl p-2 font-mono text-xs select-all">
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
                      <td className="text-muted-foreground p-4 whitespace-nowrap">
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
              This will permanently delete the reserved subdomain and terminate any active SSH
              session associated with it. This action cannot be undone.
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
