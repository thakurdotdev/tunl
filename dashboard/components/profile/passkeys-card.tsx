"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Passkey = {
  id: string;
  name?: string | null;
  createdAt?: Date | string | null;
  deviceType?: string;
};

export function PasskeysCard() {
  const [items, setItems] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await authClient.passkey.listUserPasskeys();
      if (error) throw new Error(error.message);
      setItems((data ?? []) as Passkey[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load passkeys");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const add = async () => {
    const name = window.prompt("Name this passkey", "My passkey");
    if (name === null) return;
    setBusy(true);
    try {
      const { error } = await authClient.passkey.addPasskey({
        name: name.trim().slice(0, 64) || "Passkey",
      });
      if (error) throw new Error(error.message);
      toast.success("Passkey added");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Passkey registration failed");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (item: Passkey) => {
    if (
      items.length === 1 &&
      !window.confirm("This is your only passkey. Remove it? You will need another sign-in method.")
    )
      return;
    if (!window.confirm(`Remove “${item.name || "Passkey"}” from your account?`)) return;
    setBusy(true);
    try {
      const { error } = await authClient.passkey.deletePasskey({ id: item.id });
      if (error) throw new Error(error.message);
      toast.success("Passkey removed");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove passkey");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="surface-card bg-card overflow-hidden rounded-xl border font-sans">
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <h3 className="text-foreground text-sm font-semibold">Passkeys</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Sign in with Face ID, Touch ID or a security key.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || loading}
          onClick={() => void add()}
          className="shrink-0"
        >
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}
          Add
        </Button>
      </div>
      {loading ? (
        <div className="border-t border-[var(--hairline)] px-5 py-3">
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        </div>
      ) : (
        items.length > 0 && (
          <ul className="divide-y divide-[var(--hairline)] border-t border-[var(--hairline)]">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2 pr-2 pl-5 text-xs">
                <Fingerprint className="text-muted-foreground h-4 w-4 shrink-0" />
                <span className="text-foreground min-w-0 flex-1 truncate font-medium">
                  {item.name || "Passkey"}
                </span>
                {item.createdAt && (
                  <span className="text-muted-foreground hidden sm:inline">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={busy}
                  aria-label={`Remove ${item.name || "passkey"}`}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => void remove(item)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );
}
