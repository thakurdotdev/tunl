"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useSshKeysQuery,
  useCreateSshKeyMutation,
  useDeleteSshKeyMutation,
} from "@/hooks/use-ssh-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Key, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";

const sshKeySchema = z.object({
  label: z.string().max(100, "Label must be at most 100 characters").default(""),
  publicKey: z
    .string()
    .min(20, "Public key must be at least 20 characters")
    .max(16384, "Public key is too long"),
});

type SshKeyFormValues = z.infer<typeof sshKeySchema>;

export default function SshKeysPage() {
  const { data: keys = [], isLoading } = useSshKeysQuery();
  const createMutation = useCreateSshKeyMutation();
  const deleteMutation = useDeleteSshKeyMutation();

  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SshKeyFormValues>({
    resolver: zodResolver(sshKeySchema),
    defaultValues: {
      label: "",
      publicKey: "",
    },
  });

  const onSubmit = (values: SshKeyFormValues) => {
    createMutation.mutate(
      { publicKey: values.publicKey, label: values.label },
      {
        onSuccess: () => {
          toast.success("SSH Key added successfully!");
          reset();
        },
        onError: (err) => {
          if (err instanceof ApiClientError) {
            toast.error(err.message);
          } else {
            toast.error("Failed to add SSH key. Please verify the format.");
          }
        },
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteKeyId) return;
    deleteMutation.mutate(deleteKeyId, {
      onSuccess: () => {
        toast.success("SSH Key deleted successfully!");
        setDeleteKeyId(null);
      },
      onError: (err) => {
        if (err instanceof ApiClientError) {
          toast.error(err.message);
        } else {
          toast.error("Failed to delete SSH key.");
        }
        setDeleteKeyId(null);
      },
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SSH Keys</h1>
        <p className="text-muted-foreground text-sm">
          Manage the public keys authorized to establish tunnels.
        </p>
      </div>

      <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6">
        <h2 className="text-lg font-medium">Add SSH Key</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="label">Key Label</Label>
            <Input
              id="label"
              placeholder="e.g. My Laptop"
              disabled={createMutation.isPending}
              {...register("label")}
              aria-invalid={!!errors.label}
            />
            {errors.label && <p className="text-destructive text-xs">{errors.label.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="publicKey">Public Key</Label>
            <Textarea
              id="publicKey"
              rows={4}
              placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQD..."
              disabled={createMutation.isPending}
              {...register("publicKey")}
              aria-invalid={!!errors.publicKey}
            />
            {errors.publicKey && (
              <p className="text-destructive text-xs">{errors.publicKey.message}</p>
            )}
          </div>
          <Button type="submit" disabled={createMutation.isPending} className="h-8 self-start">
            {createMutation.isPending ? "Adding Key..." : "Add SSH Key"}
          </Button>
        </form>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-2xl border">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <div className="border-foreground/20 border-t-foreground h-5 w-5 animate-spin rounded-full border-2" />
            <p className="text-muted-foreground text-sm">Loading keys...</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
            <Key className="text-muted-foreground/50 h-10 w-10" />
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-medium">No SSH keys registered</h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                Add an SSH public key above to authorize your client to run tunnels.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-border bg-muted/30 border-b">
                  <th className="text-muted-foreground p-4 font-medium">Label</th>
                  <th className="text-muted-foreground p-4 font-medium">Fingerprint</th>
                  <th className="text-muted-foreground p-4 font-medium">Added</th>
                  <th className="text-muted-foreground p-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr
                    key={key.id}
                    className="border-border hover:bg-muted/10 border-b transition-colors last:border-0"
                  >
                    <td className="text-foreground p-4 font-medium">
                      {key.label || "Untitled Key"}
                    </td>
                    <td className="text-muted-foreground p-4 font-mono text-xs">
                      {key.fingerprint}
                    </td>
                    <td className="text-muted-foreground p-4 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(key.createdAt), "MMM d, yyyy")}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => setDeleteKeyId(key.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteKeyId}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SSH Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this key? Any tunnels established using this key will
              be terminated and you will not be able to authenticate with it anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteKeyId(null)}>Cancel</AlertDialogCancel>
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
