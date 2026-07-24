import { useState } from "react";
import type { UserProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

  const isUnchanged =
    enabled === (profile?.ipWhitelistEnabled ?? false) &&
    JSON.stringify(ips) === JSON.stringify(profile?.allowedIps ?? []);

  return (
    <div className="border-border/60 bg-card/90 flex flex-col overflow-hidden rounded-xl border shadow-xs">
      <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-5 py-3 text-xs">
        <div className="flex items-center gap-2 font-mono">
          <Shield className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-foreground text-xs font-semibold">IP Restrictions</span>
        </div>
        {enabled ? (
          <span className="flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-400">
            <CheckCircle2 className="h-3 w-3" /> ACTIVE
          </span>
        ) : (
          <span className="border-border bg-muted/40 text-muted-foreground rounded-full border px-2 py-0.5 font-mono text-[10px]">
            DISABLED
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 p-6 font-mono text-xs">
        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border p-2.5 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Enable Toggle Switch */}
        <div className="border-border/60 bg-muted/20 flex items-center justify-between rounded-lg border px-3.5 py-2.5">
          <label
            htmlFor="toggleWhitelist"
            className="text-foreground cursor-pointer text-xs font-semibold"
          >
            ENFORCE IP WHITELIST
          </label>
          <Switch
            id="toggleWhitelist"
            checked={enabled}
            onCheckedChange={(checked) => setEnabled(checked)}
          />
        </div>

        {/* Add IP Form */}
        <form onSubmit={handleAddIp} className="flex gap-2">
          <Input
            type="text"
            placeholder="e.g. 192.168.1.100 or 10.0.0.0/8"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            className="bg-background/50 border-border/60 focus-visible:ring-primary/40 h-8 rounded-lg font-mono text-xs"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="border-border/60 h-8 shrink-0 font-mono text-xs"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Rule
          </Button>
        </form>

        {/* IP List */}
        <div className="space-y-2">
          {ips.length === 0 ? (
            <div className="border-border/60 bg-muted/10 text-muted-foreground/70 rounded-lg border p-3 text-center text-xs">
              No IP rules configured.
            </div>
          ) : (
            ips.map((ip) => (
              <div
                key={ip}
                className="border-border/60 bg-muted/20 flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 font-mono">
                  <Globe className="h-3.5 w-3.5 text-cyan-400 opacity-80" />
                  <span className="text-foreground font-semibold">{ip}</span>
                </div>
                <button
                  onClick={() => handleRemoveIp(ip)}
                  className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-end pt-1">
          <Button
            size="sm"
            onClick={handleSaveWhitelist}
            disabled={isPending || isUnchanged}
            className="h-8 font-mono text-xs font-semibold"
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
      </div>
    </div>
  );
}
