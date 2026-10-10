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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <div className="space-y-6 font-sans">
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">SSH public keys</h1>
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <Card className="flex h-full flex-col gap-0 p-0 shadow-none">
          <CardHeader className="flex min-h-[74px] flex-row flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
            <div className="min-w-0">
              <CardTitle className="text-sm">Generate or copy a key</CardTitle>
            </div>
            <Tabs
              value={activeOs}
              onValueChange={(value) => {
                if (value) setActiveOs(value as typeof activeOs);
              }}
            >
              <TabsList aria-label="Select operating system" className="h-8 rounded-md p-0.5">
                <TabsTrigger value="mac" className="rounded-sm px-2 text-[11px]">macOS</TabsTrigger>
                <TabsTrigger value="linux" className="rounded-sm px-2 text-[11px]">Linux</TabsTrigger>
                <TabsTrigger value="windows" className="rounded-sm px-2 text-[11px]">Windows</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 p-5">
            <div className="flex gap-2.5 border-l-2 border-amber-500/60 py-1 pl-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                If <code className="font-mono text-foreground">~/.ssh/id_ed25519.pub</code> exists, skip generation to avoid overwriting a key you already use.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Generate an Ed25519 key</p>
              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-background p-2.5">
                <code className="min-w-0 flex-1 truncate font-mono text-xs text-primary">$ {osCommands[activeOs].generate}</code>
                <Button variant="outline" size="icon-sm" aria-label="Copy key generation command" onClick={() => copyCommand(osCommands[activeOs].generate, "Generate")}>
                  <Copy />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Print and copy the public key</p>
              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-background p-2.5">
                <code className="min-w-0 flex-1 truncate font-mono text-xs text-primary">$ {osCommands[activeOs].copy}</code>
                <Button variant="outline" size="icon-sm" aria-label="Copy public key command" onClick={() => copyCommand(osCommands[activeOs].copy, "Copy")}>
                  <Copy />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col gap-0 p-0 shadow-none">
          <CardHeader className="flex min-h-[74px] flex-row items-center border-b border-border/60 px-5 py-4">
            <CardTitle className="text-sm">Add a public key</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-5">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="label">Key label</Label>
                <Input
                  id="label"
                  placeholder="e.g. work-laptop"
                  disabled={createMutation.isPending}
                  {...register("label")}
                  aria-invalid={!!errors.label}
                />
                {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="publicKey">Public key</Label>
                <Textarea
                  id="publicKey"
                  rows={4}
                  placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... user@machine"
                  disabled={createMutation.isPending}
                  className="resize-y font-mono text-xs"
                  {...register("publicKey")}
                  aria-invalid={!!errors.publicKey}
                />
                {errors.publicKey && <p className="text-xs text-destructive">{errors.publicKey.message}</p>}
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="self-start">
                <Key className="h-4 w-4" />
                {createMutation.isPending ? "Registering key..." : "Authorize key"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 p-0 shadow-none">
        <div className="flex flex-col justify-between gap-2 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold">Authorized devices</h2>
          </div>
          <span className="rounded-md border border-border/60 bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">{keys.length} {keys.length === 1 ? "key" : "keys"}</span>
        </div>

        {isLoading ? (
          <CardContent className="space-y-3 p-5">
            <div className="h-8 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted/70" />
          </CardContent>
        ) : keys.length === 0 ? (
          <CardContent className="px-5 py-7">
            <h3 className="text-sm font-medium">No keys registered</h3>
            <p className="mt-1 text-xs text-muted-foreground">Add a public key above to authorize a device.</p>
          </CardContent>
        ) : (
          <Table className="min-w-[580px] text-left text-xs">
            <TableHeader className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[190px] px-5">Device</TableHead>
                <TableHead>SHA256 fingerprint</TableHead>
                <TableHead className="w-[160px]">Added</TableHead>
                <TableHead className="w-[76px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="px-5 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-border/60 bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">ED25519</span>
                      <span className="max-w-[130px] truncate">{key.label || "Untitled device"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-md items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded border border-border/60 bg-muted/50 px-2 py-1 font-mono text-[11px] text-muted-foreground">{key.fingerprint}</code>
                      <Button variant="outline" size="icon-xs" aria-label="Copy fingerprint" onClick={() => copyCommand(key.fingerprint, "Fingerprint")}><Copy /></Button>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{format(new Date(key.createdAt), "MMM d, yyyy")}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" size="icon-xs" aria-label={`Revoke ${key.label || "SSH key"}`} onClick={() => setDeleteKeyId(key.id)}><Trash2 /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Delete Modal */}
      <AlertDialog open={!!deleteKeyId}>
        <AlertDialogContent className="font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke SSH Key?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs">
              This will remove the authorized key. Active tunnels established with this key will be
              disconnected immediately.
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
