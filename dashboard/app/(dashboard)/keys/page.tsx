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
import { AlertCircle, Calendar, Copy, Key, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    const platform =
      (
        navigator as unknown as { userAgentData?: { platform?: string } }
      ).userAgentData?.platform?.toLowerCase() || "";

    if (ua.includes("win") || platform.includes("win")) {
      setActiveOs("windows");
    } else if (ua.includes("linux") || ua.includes("x11") || platform.includes("linux")) {
      setActiveOs("linux");
    } else if (ua.includes("mac") || ua.includes("darwin") || platform.includes("mac")) {
      setActiveOs("mac");
    }
  }, []);

  const osCommands = {
    mac: {
      generate: 'ssh-keygen -t ed25519 -C "your_email@example.com"',
      copy: "pbcopy < ~/.ssh/id_ed25519.pub",
      view: "cat ~/.ssh/id_ed25519.pub",
    },
    linux: {
      generate: 'ssh-keygen -t ed25519 -C "your_email@example.com"',
      copy: "cat ~/.ssh/id_ed25519.pub",
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
    <div className="flex flex-col gap-8 font-mono">
      {/* Page Header */}
      <div className="border-border/60 flex flex-col gap-1 border-b pb-5">
        <div className="flex items-center gap-2">
          <span className="text-primary text-xl font-bold">{">"}</span>
          <h1 className="text-xl font-bold tracking-tight">SSH Public Keys</h1>
        </div>
        <p className="text-muted-foreground text-xs">
          // Register OpenSSH public keys to authorize client connections and reserved subdomains.
        </p>
      </div>

      {/* 2-Column Split Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Unified Guide & Register Key Box */}
        <div className="border-border/60 bg-card/90 flex flex-col overflow-hidden rounded-xl border shadow-xs backdrop-blur-xs lg:col-span-5">
          <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-5 py-3 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <Key className="text-primary h-3.5 w-3.5" />
              <span className="text-foreground text-xs font-semibold">Register SSH Public Key</span>
            </div>
            <div className="bg-muted/80 border-border/60 flex rounded-md border p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setActiveOs("mac")}
                className={`rounded-xs px-2 py-0.5 font-semibold transition-colors ${
                  activeOs === "mac"
                    ? "bg-primary/20 text-primary border-primary/40 border"
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
                    ? "bg-primary/20 text-primary border-primary/40 border"
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
                    ? "bg-primary/20 text-primary border-primary/40 border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Win
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6 p-6">
            {/* Guide Section */}
            <div className="flex flex-col gap-3">
              <span className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                1. GENERATE & COPY KEY ({activeOs.toUpperCase()})
              </span>

              <div className="border-border/60 bg-muted/20 flex flex-col gap-1 rounded-lg border p-3 text-xs">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Already have an SSH key?</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  If <code className="text-foreground font-mono">~/.ssh/id_ed25519.pub</code> or{" "}
                  <code className="text-foreground font-mono">id_rsa.pub</code> exists, skip key
                  generation to avoid overwriting keys used elsewhere!
                </p>
              </div>

              <div className="bg-background/60 text-primary border-border/60 flex items-center justify-between gap-2 rounded-lg border p-2.5 text-[11px]">
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
              <div className="bg-background/60 text-primary border-border/60 flex items-center justify-between gap-2 rounded-lg border p-2.5 text-[11px]">
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

            <div className="border-border/50 border-t" />

            {/* Registration Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <span className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                2. PASTE KEY CONTENT
              </span>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="label" className="text-muted-foreground text-xs font-semibold">
                  KEY IDENTIFIER / LABEL
                </Label>
                <Input
                  id="label"
                  placeholder="e.g. dev-laptop-macbook"
                  disabled={createMutation.isPending}
                  className="bg-background/50 border-border/60 focus-visible:ring-primary/40 h-9 rounded-lg font-mono text-xs"
                  {...register("label")}
                  aria-invalid={!!errors.label}
                />
                {errors.label && (
                  <p className="text-destructive font-mono text-xs">{errors.label.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="publicKey" className="text-muted-foreground text-xs font-semibold">
                  PUBLIC KEY CONTENT (id_ed25519.pub)
                </Label>
                <Textarea
                  id="publicKey"
                  rows={4}
                  placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... user@machine"
                  disabled={createMutation.isPending}
                  className="bg-background/50 border-border/60 focus-visible:ring-primary/40 resize-none rounded-lg font-mono text-xs"
                  {...register("publicKey")}
                  aria-invalid={!!errors.publicKey}
                />
                {errors.publicKey && (
                  <p className="text-destructive font-mono text-xs">{errors.publicKey.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={createMutation.isPending}
                size="sm"
                className="h-9 gap-1.5 self-start px-4 font-mono text-xs"
              >
                {createMutation.isPending ? "Registering..." : "[+ Add Public Key]"}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: Registered Keys Inspector */}
        <div className="border-border/60 bg-card/90 flex flex-col overflow-hidden rounded-xl border shadow-xs backdrop-blur-xs lg:col-span-7">
          <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-5 py-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-foreground text-xs font-semibold">Authorized SSH Keys</span>
              <span className="bg-primary/10 text-primary border-primary/20 py-0.2 rounded-full border px-2 text-[10px] font-bold">
                {keys.length}
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400">AUTHORIZED</span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="border-primary/20 border-t-primary h-5 w-5 animate-spin rounded-full border-2" />
              <p className="text-muted-foreground font-mono text-xs">Reading authorized keys...</p>
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-20 text-center">
              <Key className="text-muted-foreground/30 h-8 w-8" />
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold">No authorized keys found</h3>
                <p className="text-muted-foreground max-w-xs text-xs">
                  Register your SSH public key to authenticate client tunnels.
                </p>
              </div>
            </div>
          ) : (
            <div className="no-scrollbar flex-1 overflow-x-auto">
              <table className="w-full border-collapse text-left font-mono text-xs">
                <thead>
                  <tr className="border-border/60 bg-muted/20 text-muted-foreground border-b text-[11px] tracking-wider uppercase">
                    <th className="w-[160px] p-4 font-semibold">Key Label</th>
                    <th className="p-4 font-semibold">SHA256 Fingerprint</th>
                    <th className="w-[130px] p-4 font-semibold">Added Date</th>
                    <th className="w-[70px] p-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr
                      key={key.id}
                      className="border-border/40 hover:bg-muted/20 border-b transition-colors last:border-0"
                    >
                      <td className="text-foreground p-4 font-bold">
                        <div className="flex items-center gap-2">
                          <span className="bg-primary/10 text-primary border-primary/30 rounded border px-1.5 py-0.5 text-[10px]">
                            ED25519
                          </span>
                          <span className="max-w-[100px] truncate">{key.label || "Untitled"}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground p-4 font-mono text-[11px]">
                        <div className="flex max-w-[210px] items-center gap-1.5">
                          <code className="bg-muted/60 text-muted-foreground border-border/60 block flex-1 truncate rounded border px-2 py-0.5 text-[10px] select-all">
                            {key.fingerprint}
                          </code>
                          <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() => copyCommand(key.fingerprint, "Fingerprint")}
                            className="shrink-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="text-muted-foreground p-4 text-[11px] whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(key.createdAt), "MMM d, yyyy")}
                        </span>
                      </td>
                      <td className="p-4 text-right">
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
              This will remove the authorized key. Active tunnels opened with this key will be
              disconnected immediately.
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
