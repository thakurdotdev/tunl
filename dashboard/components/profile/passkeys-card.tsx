"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Passkey = { id: string; name?: string | null; createdAt?: Date | string | null; deviceType?: string };

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
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load passkeys"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const add = async () => {
    const name = window.prompt("Name this passkey", "My passkey");
    if (name === null) return;
    setBusy(true);
    try {
      const { error } = await authClient.passkey.addPasskey({ name: name.trim().slice(0, 64) || "Passkey" });
      if (error) throw new Error(error.message);
      toast.success("Passkey added"); await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Passkey registration failed"); }
    finally { setBusy(false); }
  };
  const remove = async (item: Passkey) => {
    if (items.length === 1 && !window.confirm("This is your only passkey. Remove it? You will need another sign-in method.")) return;
    if (!window.confirm(`Remove “${item.name || "Passkey"}” from your account?`)) return;
    setBusy(true);
    try { const { error } = await authClient.passkey.deletePasskey({ id: item.id }); if (error) throw new Error(error.message); toast.success("Passkey removed"); await refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove passkey"); }
    finally { setBusy(false); }
  };
  return <section className="border-border/60 bg-card overflow-hidden rounded-lg border font-sans">
    <header className="border-border/60 bg-muted/40 flex items-center gap-2 border-b px-4 py-3 text-xs font-semibold"><Fingerprint className="text-emerald-400 h-4 w-4"/>Passkeys</header>
    <div className="space-y-3 p-5 text-xs">
      <p className="text-muted-foreground">Use your device biometrics, PIN, or a security key to sign in securely.</p>
      {loading ? <Loader2 className="text-muted-foreground h-4 w-4 animate-spin"/> : items.length === 0 ? <p className="text-muted-foreground">No passkeys registered yet.</p> : items.map((item) => <div key={item.id} className="border-border/60 flex items-center justify-between rounded-md border p-3"><div><p className="text-foreground font-medium">{item.name || "Passkey"}</p><p className="text-muted-foreground mt-1">{item.deviceType || "Authenticator"}{item.createdAt ? ` · Added ${new Date(item.createdAt).toLocaleDateString()}` : ""}</p></div><Button variant="outline" size="sm" disabled={busy} aria-label={`Remove ${item.name || "passkey"}`} onClick={() => void remove(item)}><Trash2 className="text-destructive h-4 w-4"/></Button></div>)}
      <Button size="sm" disabled={busy || loading} onClick={() => void add()}>{busy && <Loader2 className="mr-2 h-3 w-3 animate-spin"/>}Add a passkey</Button>
    </div>
  </section>;
}
