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
    <div className="flex flex-col gap-6 font-mono">
      {/* Page Header */}
      <div className="flex flex-col gap-1 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold text-xl">{">"}</span>
          <h1 className="text-xl font-bold tracking-tight">SSH Public Keys</h1>
        </div>
        <p className="text-muted-foreground text-xs">
          // Register OpenSSH public keys to authorize client connections and reserved subdomains.
        </p>
      </div>

      {/* 2-Column Split Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: CLI Guide & Add Key Form */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Guide Terminal Window */}
          <div className="border-border bg-card overflow-hidden rounded-lg border shadow-xs">
            <div className="border-border bg-muted/40 flex items-center justify-between border-b px-4 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-muted-foreground ml-2 font-mono text-[11px]">
                  tunl :: ssh-keygen-guide
                </span>
              </div>
              <div className="bg-muted/80 border-border flex rounded-md border p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setActiveOs("mac")}
                  className={`rounded-xs px-2 py-0.5 font-semibold transition-colors ${
                    activeOs === "mac"
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  macOS
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOs("linux")}
                  className={`rounded-xs px-2 py-0.5 font-semibold transition-colors ${
                    activeOs === "linux"
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Linux
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOs("windows")}
                  className={`rounded-xs px-2 py-0.5 font-semibold transition-colors ${
                    activeOs === "windows"
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Win
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-amber-500">1. GENERATE KEY</span>
                <div className="bg-background/80 text-primary border-border flex items-center justify-between gap-2 rounded border p-2 text-[11px]">
                  <code className="truncate">$ {osCommands[activeOs].generate}</code>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() => copyCommand(osCommands[activeOs].generate, "Generate")}
                    className="shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-emerald-400">2. COPY PUBLIC KEY</span>
                <div className="bg-background/80 text-primary border-border flex items-center justify-between gap-2 rounded border p-2 text-[11px]">
                  <code className="truncate">$ {osCommands[activeOs].copy}</code>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() => copyCommand(osCommands[activeOs].copy, "Copy")}
                    className="shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Add Key Form Window */}
          <div className="border-border bg-card overflow-hidden rounded-lg border shadow-xs">
            <div className="border-border bg-muted/40 flex items-center justify-between border-b px-4 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-muted-foreground ml-2 font-mono text-[11px]">
                  tunl :: register-public-key
                </span>
              </div>
              <span className="text-muted-foreground text-[10px]">AUTHORIZED_KEYS</span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="label" className="text-xs font-semibold text-muted-foreground">
                  KEY IDENTIFIER / LABEL
                </Label>
                <Input
                  id="label"
                  placeholder="e.g. dev-laptop-macbook"
                  disabled={createMutation.isPending}
                  className="bg-background/50 border-border h-9 font-mono text-xs focus-visible:ring-primary/40"
                  {...register("label")}
                  aria-invalid={!!errors.label}
                />
                {errors.label && <p className="text-destructive text-xs font-mono">{errors.label.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="publicKey" className="text-xs font-semibold text-muted-foreground">
                  SSH PUBLIC KEY CONTENT (id_ed25519.pub)
                </Label>
                <Textarea
                  id="publicKey"
                  rows={4}
                  placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... user@machine"
                  disabled={createMutation.isPending}
                  className="bg-background/50 border-border font-mono text-xs focus-visible:ring-primary/40 resize-none"
                  {...register("publicKey")}
                  aria-invalid={!!errors.publicKey}
                />
                {errors.publicKey && (
                  <p className="text-destructive text-xs font-mono">{errors.publicKey.message}</p>
                )}
              </div>

              <Button type="submit" disabled={createMutation.isPending} size="sm" className="h-9 font-mono text-xs gap-1.5 self-start">
                {createMutation.isPending ? "Registering..." : "[+ Add Public Key]"}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: Registered Keys Inspector */}
        <div className="lg:col-span-7 border-border bg-card overflow-hidden rounded-lg border shadow-xs flex flex-col">
          <div className="border-border bg-muted/40 flex items-center justify-between border-b px-4 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-muted-foreground ml-2 font-mono text-[11px]">
                tunl :: authorized-keys [{keys.length}]
              </span>
            </div>
            <span className="text-emerald-400 font-bold text-[10px]">AUTHORIZED</span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="border-primary/20 border-t-primary h-5 w-5 animate-spin rounded-full border-2" />
              <p className="text-muted-foreground text-xs font-mono">Reading authorized keys...</p>
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center flex-1">
              <Key className="text-muted-foreground/30 h-8 w-8" />
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold">No authorized keys found</h3>
                <p className="text-muted-foreground max-w-xs text-xs">
                  Register your SSH public key to authenticate client tunnels.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full border-collapse text-left text-xs font-mono">
                <thead>
                  <tr className="border-border bg-muted/20 border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="p-3.5 font-semibold">Key Label</th>
                    <th className="p-3.5 font-semibold">SHA256 Fingerprint</th>
                    <th className="p-3.5 font-semibold">Added Date</th>
                    <th className="p-3.5 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr
                      key={key.id}
                      className="border-border hover:bg-muted/15 border-b transition-colors last:border-0"
                    >
                      <td className="text-foreground p-3.5 font-bold">
                        <div className="flex items-center gap-2">
                          <span className="bg-primary/10 text-primary border border-primary/30 rounded px-1.5 py-0.5 text-[10px]">
                            ED25519
                          </span>
                          <span>{key.label || "Untitled Key"}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground p-3.5 font-mono text-[11px]">
                        <code className="bg-muted/65 border-border rounded border px-1.5 py-0.5 text-[10px]">
                          {key.fingerprint}
                        </code>
                      </td>
                      <td className="text-muted-foreground p-3.5 whitespace-nowrap text-[11px]">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(key.createdAt), "MMM d, yyyy")}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          variant="destructive"
                          size="icon-xs"
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
      </div>

      <AlertDialog open={!!deleteKeyId}>
        <AlertDialogContent className="font-mono">
          <AlertDialogHeader>
            <AlertDialogTitle>[!] REVOKE SSH KEY?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will remove the authorized key. Active tunnels opened with this key will be disconnected immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteKeyId(null)} className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
            >
              [Revoke Key]
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


