"use client";

import { PageHeader } from "@/components/portal/page-header";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateSshKeyMutation,
  useDeleteSshKeyMutation,
  useSshKeysQuery,
} from "@/hooks/use-ssh-keys";
import { ApiClientError } from "@/lib/api-client";
import type { SSHKey } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Check, ChevronDown, Copy, KeyRound, Laptop, Plus, Trash2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
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
type Os = "mac" | "linux" | "windows";

const OS_COMMANDS: Record<Os, { generate: string; copy: string }> = {
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

const noopSubscribe = () => () => {};
function detectOs(): Os {
  const ua = navigator.userAgent.toLowerCase();
  const platform =
    (
      navigator as unknown as { userAgentData?: { platform?: string } }
    ).userAgentData?.platform?.toLowerCase() ?? "";
  if (ua.includes("win") || platform.includes("win")) return "windows";
  if (ua.includes("linux") || ua.includes("x11") || platform.includes("linux")) return "linux";
  return "mac";
}

function keyTypeFromInput(value: string) {
  const match = value.trim().match(/^(ssh-ed25519|ssh-rsa|ecdsa-sha2-\S+|sk-\S+)\s/);
  return match?.[1] ?? null;
}

function StepCommand({
  command,
  copied,
  onCopy,
}: {
  command: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="surface-input bg-background flex min-w-0 items-center gap-2 rounded-lg border py-1.5 pr-1.5 pl-3 font-mono text-xs">
      <span className="text-muted-foreground/70 select-none">$</span>
      <code className="text-primary min-w-0 flex-1 truncate select-all" title={command}>
        {command}
      </code>
      <Button variant="ghost" size="icon-sm" aria-label="Copy command" onClick={onCopy}>
        {copied ? <Check className="text-primary" /> : <Copy />}
      </Button>
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="border-primary/40 text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold">
      {n}
    </span>
  );
}

export default function SshKeysPage() {
  const { data: keys = [], isLoading } = useSshKeysQuery();
  const createMutation = useCreateSshKeyMutation();
  const deleteMutation = useDeleteSshKeyMutation();

  const detectedOs = useSyncExternalStore(noopSubscribe, detectOs, () => "mac" as Os);
  const [chosenOs, setChosenOs] = useState<Os | null>(null);
  const os = chosenOs ?? detectedOs;

  const [revokeKey, setRevokeKey] = useState<SSHKey | null>(null);
  const [addOpen, setAddOpen] = useState<boolean | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const hasKeys = keys.length > 0;
  // Expanded by default until the first key exists; then it folds behind a button.
  const showAdd = addOpen ?? (!isLoading && !hasKeys);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SshKeyFormValues>({
    resolver: zodResolver(sshKeySchema),
    defaultValues: { label: "", publicKey: "" },
  });
  const detectedType = keyTypeFromInput(watch("publicKey") ?? "");

  const copy = (text: string, id: string, message: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    toast.success(message);
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1800);
  };

  const onSubmit = (values: SshKeyFormValues) => {
    createMutation.mutate(
      { publicKey: values.publicKey.trim(), label: values.label.trim() },
      {
        onSuccess: () => {
          toast.success("Key added. This device can open tunnels now.");
          reset();
          setAddOpen(false);
        },
        onError: (err) => {
          toast.error(
            err instanceof ApiClientError
              ? err.message
              : "Failed to add SSH key. Check that you pasted the .pub file.",
          );
        },
      },
    );
  };

  const confirmRevoke = () => {
    if (!revokeKey) return;
    deleteMutation.mutate(revokeKey.id, {
      onSuccess: () => toast.success(`Revoked ${revokeKey.label || "key"}`),
      onError: (err) =>
        toast.error(err instanceof ApiClientError ? err.message : "Failed to revoke SSH key."),
      onSettled: () => setRevokeKey(null),
    });
  };

  const keyList = (
    <section className="surface-card bg-card overflow-hidden rounded-xl border">
      {isLoading ? (
        <div className="space-y-2 p-5">
          <div className="bg-muted h-12 animate-pulse rounded-lg" />
          <div className="bg-muted/70 h-12 animate-pulse rounded-lg" />
        </div>
      ) : (
        <ul className="divide-y divide-[var(--hairline)]">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center gap-3 py-2.5 pr-2 pl-4 sm:pl-5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Laptop className="text-muted-foreground h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">
                    {key.label || "Untitled device"}
                  </p>
                  <button
                    type="button"
                    onClick={() => copy(key.fingerprint, key.id, "Copied fingerprint")}
                    className="text-muted-foreground hover:text-foreground group mt-0.5 flex max-w-full items-center gap-1.5 text-left font-mono text-[11px]"
                    title="Copy fingerprint"
                  >
                    <span className="truncate">{key.fingerprint}</span>
                    {copied === key.id ? (
                      <Check className="text-primary h-3 w-3 shrink-0" />
                    ) : (
                      <Copy className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 max-sm:opacity-60" />
                    )}
                  </button>
                </div>
              </div>
              <span className="text-muted-foreground hidden text-xs whitespace-nowrap sm:inline">
                {format(new Date(key.createdAt), "MMM d, yyyy")}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setRevokeKey(key)}
                aria-label={`Revoke ${key.label || "SSH key"}`}
                title="Revoke"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const addDevice = showAdd && (
    <section className="surface-card bg-card overflow-hidden rounded-xl border">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--hairline)] px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-foreground text-sm font-semibold">
            {hasKeys ? "Add another device" : "Add your first device"}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Already have a key? Skip to step 3.
          </p>
        </div>
        {hasKeys && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={() => setAddOpen(false)}
          >
            <ChevronDown className="rotate-180" />
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-2">
        {/* Steps 1–2 */}
        <div className="flex flex-col gap-5 border-[var(--hairline)] p-4 max-lg:border-b sm:p-5 lg:border-r">
          <Tabs value={os} onValueChange={(v) => v && setChosenOs(v as Os)}>
            <TabsList aria-label="Your operating system" className="h-8 rounded-lg p-0.5">
              <TabsTrigger value="mac" className="rounded-md px-2.5 text-xs">
                macOS
              </TabsTrigger>
              <TabsTrigger value="linux" className="rounded-md px-2.5 text-xs">
                Linux
              </TabsTrigger>
              <TabsTrigger value="windows" className="rounded-md px-2.5 text-xs">
                Windows
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-3">
            <StepBadge n={1} />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-foreground text-[13px] font-medium">Generate a key</p>
              <StepCommand
                command={OS_COMMANDS[os].generate}
                copied={copied === "gen"}
                onCopy={() => copy(OS_COMMANDS[os].generate, "gen", "Copied command")}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <StepBadge n={2} />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-foreground text-[13px] font-medium">Copy the public key</p>
              <StepCommand
                command={OS_COMMANDS[os].copy}
                copied={copied === "copy"}
                onCopy={() => copy(OS_COMMANDS[os].copy, "copy", "Copied command")}
              />
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3 p-4 sm:p-5">
          <StepBadge n={3} />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="publicKey" className="text-[13px] font-medium">
                  Paste the public key
                </Label>
                {detectedType && (
                  <span className="text-primary font-mono text-[11px]">{detectedType}</span>
                )}
              </div>
              <Textarea
                id="publicKey"
                rows={4}
                placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI… you@laptop"
                disabled={createMutation.isPending}
                spellCheck={false}
                className="resize-y font-mono text-xs break-all"
                {...register("publicKey")}
                aria-invalid={!!errors.publicKey}
              />
              {errors.publicKey && (
                <p className="text-destructive text-xs">{errors.publicKey.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="label" className="text-xs">
                Device name <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="label"
                placeholder="work-laptop"
                disabled={createMutation.isPending}
                className="h-9"
                {...register("label")}
                aria-invalid={!!errors.label}
              />
              {errors.label && <p className="text-destructive text-xs">{errors.label.message}</p>}
            </div>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="h-9 self-stretch sm:self-start"
            >
              <KeyRound />
              {createMutation.isPending ? "Adding…" : "Add key"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="SSH keys"
        description="Every device that opens tunnels needs its key here."
        actions={
          hasKeys && !showAdd ? (
            <Button onClick={() => setAddOpen(true)}>
              <Plus /> Add device
            </Button>
          ) : undefined
        }
      />

      {addDevice}
      {(isLoading || hasKeys) && keyList}

      <AlertDialog open={!!revokeKey}>
        <AlertDialogContent className="font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke “{revokeKey?.label || "this key"}”?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs">
              This device can’t open tunnels anymore, and its open tunnels disconnect now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRevokeKey(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevoke} variant="danger">
              Revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
