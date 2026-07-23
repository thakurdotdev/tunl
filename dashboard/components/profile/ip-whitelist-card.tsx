import { useState } from "react";
import type { UserProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Globe,
  Loader2,
  Plus,
  Save,
  Shield,
  Trash2,
} from "lucide-react";

interface IpWhitelistCardProps {
  profile: UserProfile | undefined;
  onUpdateWhitelist: (params: { allowedIps: string[]; enabled: boolean }) => Promise<any>;
  isPending: boolean;
}

export function IpWhitelistCard({ profile, onUpdateWhitelist, isPending }: IpWhitelistCardProps) {
  const [ips, setIps] = useState<string[]>(profile?.allowedIps ?? []);
  const [enabled, setEnabled] = useState<boolean>(profile?.ipWhitelistEnabled ?? false);
  const [newIp, setNewIp] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleAddIp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = newIp.trim();
    if (!trimmed) return;

    if (ips.includes(trimmed)) {
      setError(`IP '${trimmed}' is already in the whitelist`);
      return;
    }

    setIps([...ips, trimmed]);
    setNewIp("");
  };

  const handleRemoveIp = (ipToRemove: string) => {
    setIps(ips.filter((item) => item !== ipToRemove));
  };

  const handleSaveWhitelist = async () => {
    setError("");
    try {
      await onUpdateWhitelist({ allowedIps: ips, enabled });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to update IP whitelist");
    }
  };

  return (
    <div className="bg-card border-border/80 rounded-xl border p-6 font-mono shadow-xs">
      <div className="border-border/60 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10">
            <Shield className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">IP Whitelist Security Rules</h2>
              {enabled ? (
                <span className="flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400">
                  <CheckCircle2 className="h-3 w-3" /> RESTRICTIONS ACTIVE
                </span>
              ) : (
                <span className="border-border bg-muted/40 text-muted-foreground rounded-full border px-2.5 py-0.5 text-[10px]">
                  WHITELIST DISABLED
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Restrict access to your subdomains. Incoming requests outside these IPs will receive
              HTTP 403.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleSaveWhitelist}
          disabled={isPending}
          className="h-8 text-xs font-semibold"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
            </>
          ) : saved ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Whitelist Saved!
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-3.5 w-3.5" /> Save Rules
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive mt-4 flex items-center gap-2 rounded-lg border p-3 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Enable Toggle Switch */}
      <div className="border-border/60 bg-muted/20 mt-4 flex items-center justify-between rounded-lg border p-3.5">
        <div>
          <label
            htmlFor="toggleWhitelist"
            className="text-foreground cursor-pointer text-xs font-bold"
          >
            Enable IP Whitelist Enforcement
          </label>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            When disabled, incoming traffic is allowed from all IPs regardless of the list below.
          </p>
        </div>
        <input
          type="checkbox"
          id="toggleWhitelist"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="accent-primary border-border h-4 w-4 cursor-pointer rounded"
        />
      </div>

      {/* Add IP Form */}
      <form onSubmit={handleAddIp} className="mt-4 flex gap-2">
        <Input
          type="text"
          placeholder="e.g. 192.168.1.100 or 10.0.0.0/8"
          value={newIp}
          onChange={(e) => setNewIp(e.target.value)}
          className="h-8 font-mono text-xs"
        />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="border-border h-8 shrink-0 text-xs"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add IP Rule
        </Button>
      </form>

      {/* IP List */}
      <div className="mt-4 space-y-2">
        {ips.length === 0 ? (
          <div className="border-border/60 bg-muted/20 text-muted-foreground rounded-lg border p-4 text-center text-xs">
            No IP restrictions configured. Add your trusted IP addresses above.
          </div>
        ) : (
          ips.map((ip) => (
            <div
              key={ip}
              className="border-border/60 bg-muted/30 flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2 font-mono">
                <Globe className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-foreground font-semibold">{ip}</span>
              </div>
              <button
                onClick={() => handleRemoveIp(ip)}
                className="text-muted-foreground hover:text-destructive p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
