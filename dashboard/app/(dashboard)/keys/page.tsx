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
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateSshKeyMutation,
  useDeleteSshKeyMutation,
  useSshKeysQuery,
} from "@/hooks/use-ssh-keys";
import { ApiClientError } from "@/lib/api-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar, Copy, Key, Terminal, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const sshKeySchema = z.object({
  label: z.string().max(100, "Label must be at most 100 characters"),
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

  const [activeOs, setActiveOs] = useState<"mac" | "linux" | "windows">("mac");

  const osCommands = {
    mac: {
      generate: 'ssh-keygen -t ed25519 -C "your_email@example.com"',
      copy: "pbcopy < ~/.ssh/id_ed25519.pub",
      view: "cat ~/.ssh/id_ed25519.pub",
    },
    linux: {
      generate: 'ssh-keygen -t ed25519 -C "your_email@example.com"',
      copy: "xclip -selection clipboard < ~/.ssh/id_ed25519.pub",
      view: "cat ~/.ssh/id_ed25519.pub",
    },
    windows: {
      generate: 'ssh-keygen -t ed25519 -C "your_email@example.com"',
      copy: "Get-Content ~/.ssh/id_ed25519.pub | Set-Clipboard",
      view: "type ~/.ssh/id_ed25519.pub",
    },
  };

  const copyCommand = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} command!`);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SSH Keys</h1>
        <p className="text-muted-foreground text-sm">
          Manage the public keys authorized to establish tunnels.
        </p>
      </div>

      {/* Guide Card */}
      <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="text-foreground h-5 w-5" />
            <h2 className="text-lg font-medium">How to Generate & Copy Your SSH Key</h2>
          </div>
          <div className="bg-muted flex rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveOs("mac")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                activeOs === "mac"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              macOS
            </button>
            <button
              type="button"
              onClick={() => setActiveOs("linux")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                activeOs === "linux"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Linux
            </button>
            <button
              type="button"
              onClick={() => setActiveOs("windows")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                activeOs === "windows"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Windows
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border-border bg-muted/20 flex flex-col gap-2 rounded-xl border p-4">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-500">
              Step 1: Generate Key
            </span>
            <p className="text-muted-foreground text-xs">
              Open your terminal and run this command (press Enter to accept default path):
            </p>
            <div className="flex items-center gap-2">
              <code className="bg-muted block flex-1 truncate rounded-lg p-2 font-mono text-xs select-all">
                {osCommands[activeOs].generate}
              </code>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => copyCommand(osCommands[activeOs].generate, "Generate")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="border-border bg-muted/20 flex flex-col gap-2 rounded-xl border p-4">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-500">
              Step 2: Copy Public Key
            </span>
            <p className="text-muted-foreground text-xs">
              Copy your generated public key directly to your clipboard:
            </p>
            <div className="flex items-center gap-2">
              <code className="bg-muted block flex-1 truncate rounded-lg p-2 font-mono text-xs select-all">
                {osCommands[activeOs].copy}
              </code>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => copyCommand(osCommands[activeOs].copy, "Copy")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Or view in terminal: <code className="font-mono">{osCommands[activeOs].view}</code>
            </p>
          </div>
        </div>
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
              placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... your_email@example.com"
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
