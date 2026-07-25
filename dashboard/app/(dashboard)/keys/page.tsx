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
    .min(1, "Public key is required")
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
    },
    linux: {
      generate: 'ssh-keygen -t ed25519 -C "your_email@example.com"',
      copy: "cat ~/.ssh/id_ed25519.pub",
    },
    windows: {
      generate: 'ssh-keygen -t ed25519 -C "your_email@example.com"',
      copy: "Get-Content ~/.ssh/id_ed25519.pub | Set-Clipboard",
    },
  };

  const copyCommand = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} command!`);
  };

  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* Page Header */}
      <div className="border-border/60 flex flex-col gap-1 border-b pb-5">
        <h1 className="text-xl font-bold tracking-tight text-foreground">SSH Public Keys</h1>
        <p className="text-muted-foreground text-xs">
          Register OpenSSH public keys to authorize client connections and reserved subdomains.
        </p>
      </div>

      {/* 2-Column Split Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Register Key & Guide Box */}
        <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-lg border shadow-2xs lg:col-span-5">
          <div className="border-border/60 bg-muted/40 flex items-center justify-between border-b px-4 py-2.5 text-xs font-sans">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Key className="text-primary h-4 w-4" />
              <span>Register SSH Public Key</span>
            </div>
            <div className="bg-background border-border/60 flex rounded-md border p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveOs("mac")}
                className={`rounded-xs px-2 py-0.5 font-medium transition-colors ${
                  activeOs === "mac"
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                macOS
              </button>
              <button
                type="button"
                onClick={() => setActiveOs("linux")}
                className={`rounded-xs px-2 py-0.5 font-medium transition-colors ${
                  activeOs === "linux"
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Linux
              </button>
              <button
                type="button"
                onClick={() => setActiveOs("windows")}
                className={`rounded-xs px-2 py-0.5 font-medium transition-colors ${
                  activeOs === "windows"
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Windows
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6 p-5">
            {/* Guide Section */}
            <div className="flex flex-col gap-3">
              <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                1. Generate & Copy Key ({activeOs.toUpperCase()})
              </span>

              <div className="border-border/60 bg-muted/30 flex flex-col gap-1 rounded-md border p-3 text-xs">
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Existing Key Detected?</span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  If <code className="text-foreground font-mono">~/.ssh/id_ed25519.pub</code> exists, skip generation to avoid overwriting keys used elsewhere.
                </p>
              </div>

              <div className="bg-muted/60 text-foreground border-border/60 flex items-center justify-between gap-2 rounded-md border p-2.5 font-mono text-xs select-all">
                <code className="truncate text-emerald-400">$ {osCommands[activeOs].generate}</code>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => copyCommand(osCommands[activeOs].generate, "Generate")}
                  className="shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="bg-muted/60 text-foreground border-border/60 flex items-center justify-between gap-2 rounded-md border p-2.5 font-mono text-xs select-all">
                <code className="truncate text-emerald-400">$ {osCommands[activeOs].copy}</code>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => copyCommand(osCommands[activeOs].copy, "Copy")}
                  className="shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="border-border/60 border-t" />

            {/* Registration Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                2. Paste Public Key
              </span>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="label" className="text-foreground text-xs font-medium">
                  Key Label / Identifier
                </Label>
                <Input
                  id="label"
                  placeholder="e.g. dev-laptop-macbook"
                  disabled={createMutation.isPending}
                  className="border-border/60 bg-background h-9 rounded-md font-sans text-xs"
                  {...register("label")}
                  aria-invalid={!!errors.label}
                />
                {errors.label && (
                  <p className="text-destructive text-xs">{errors.label.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="publicKey" className="text-foreground text-xs font-medium">
                  Public Key String (id_ed25519.pub)
                </Label>
                <Textarea
                  id="publicKey"
                  rows={4}
                  placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... user@machine"
                  disabled={createMutation.isPending}
                  className="border-border/60 bg-background resize-none rounded-md font-mono text-xs"
                  {...register("publicKey")}
                  aria-invalid={!!errors.publicKey}
                />
                {errors.publicKey && (
                  <p className="text-destructive text-xs">{errors.publicKey.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={createMutation.isPending}
                size="sm"
                className="h-8 gap-1.5 self-start px-4 text-xs font-semibold"
              >
                {createMutation.isPending ? "Registering..." : "Add Public Key"}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: Registered Keys List */}
        <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-lg border shadow-2xs lg:col-span-7">
          <div className="border-border/60 bg-muted/40 flex items-center justify-between border-b px-4 py-2.5 text-xs font-sans">
            <div className="flex items-center gap-2">
              <span className="text-foreground text-xs font-semibold">Authorized SSH Keys</span>
              <span className="bg-secondary text-secondary-foreground border-border/60 rounded-md border px-2 py-0.5 text-[11px] font-semibold">
                {keys.length}
              </span>
            </div>
            <span className="text-emerald-400 text-[11px] font-semibold">Authorized</span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="border-primary/20 border-t-primary h-5 w-5 animate-spin rounded-full border-2" />
              <p className="text-muted-foreground text-xs">Reading authorized keys...</p>
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
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
              <table className="w-full border-collapse text-left text-xs font-sans">
                <thead>
                  <tr className="border-border/60 bg-muted/40 text-muted-foreground border-b text-[11px] font-semibold uppercase tracking-wider">
                    <th className="w-[160px] p-4">Key Label</th>
                    <th className="p-4">SHA256 Fingerprint</th>
                    <th className="w-[130px] p-4">Added Date</th>
                    <th className="w-[70px] p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {keys.map((key) => (
                    <tr
                      key={key.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="text-foreground p-4 font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="bg-secondary text-secondary-foreground border-border/60 rounded border px-1.5 py-0.5 text-[10px] font-mono">
                            ED25519
                          </span>
                          <span className="max-w-[100px] truncate">{key.label || "Untitled"}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono">
                        <div className="flex max-w-[210px] items-center gap-1.5">
                          <code className="bg-muted/60 text-muted-foreground border-border/60 block flex-1 truncate rounded border px-2 py-0.5 text-[11px] select-all">
                            {key.fingerprint}
                          </code>
                          <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() => copyCommand(key.fingerprint, "Fingerprint")}
                            className="shrink-0"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                      <td className="text-muted-foreground p-4 text-[11px] whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(key.createdAt), "MMM d, yyyy")}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="destructive"
                          size="icon-xs"
                          onClick={() => setDeleteKeyId(key.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Delete Modal */}
      <AlertDialog open={!!deleteKeyId}>
        <AlertDialogContent className="font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke SSH Key?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              This will remove the authorized key. Active tunnels established with this key will be disconnected immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteKeyId(null)} className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
