"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateTunnelPasswordMutation } from "@/hooks/use-tunnels";
import { ApiClientError } from "@/lib/api-client";
import type { Tunnel } from "@/lib/types";
import { Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function tunnelHasPassword(tunnel: Pick<Tunnel, "hasPassword" | "password"> | null) {
  return Boolean(tunnel?.hasPassword || tunnel?.password);
}

/** Set, change or remove the HTTP Basic Auth password on one tunnel. */
export function TunnelPasswordDialog({
  tunnel,
  onClose,
}: {
  tunnel: Tunnel | null;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const mutation = useUpdateTunnelPasswordMutation();
  const protectedNow = tunnelHasPassword(tunnel);
  const host = tunnel ? `${tunnel.subdomain}.tunl.online` : "";

  const close = () => {
    setValue("");
    onClose();
  };

  const submit = (password: string | null) => {
    if (!tunnel) return;
    mutation.mutate(
      { id: tunnel.id, password },
      {
        onSuccess: () => {
          toast.success(password ? `Password set for ${host}` : `Password removed from ${host}`);
          close();
        },
        onError: (err) => {
          toast.error(
            err instanceof ApiClientError
              ? err.message
              : password
                ? "Failed to set password."
                : "Failed to remove password.",
          );
        },
      },
    );
  };

  const tooShort = value.trim().length < 4;

  return (
    <Dialog open={!!tunnel} onOpenChange={(open) => !open && close()}>
      <DialogContent className="font-sans sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
              <Lock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold">Password protection</DialogTitle>
              <DialogDescription className="text-muted-foreground truncate font-mono text-xs">
                {host}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          id="tunnel-password-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!tooShort) submit(value.trim());
          }}
          className="flex flex-col gap-4 py-1 text-xs"
        >
          {protectedNow ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
              <ShieldCheck className="mt-px h-4 w-4 shrink-0" />
              <span>
                This tunnel is password-protected. Visitors must enter HTTP Basic Auth credentials
                before any request reaches your machine.
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground leading-relaxed">
              Visitors will be asked for this password (HTTP Basic Auth) before requests reach your
              local server. Any username works.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tunnel-password" className="text-xs">
              {protectedNow ? "New password" : "Password"}
            </Label>
            <Input
              id="tunnel-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 4 characters"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </form>

        <DialogFooter className="gap-2 sm:justify-between">
          {protectedNow ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => submit(null)}
              disabled={mutation.isPending}
            >
              Remove password
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="tunnel-password-form"
              disabled={mutation.isPending || tooShort}
            >
              {mutation.isPending ? "Saving…" : "Save password"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
