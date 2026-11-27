"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useMyIpQuery, type UserProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Globe,
  Loader2,
  MapPin,
  Network,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

/* ---------------------------- IP helpers (client) --------------------------- */

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
// Loose IPv6 shape check; the server does the strict parse.
const IPV6 = /^[0-9a-f:.]+$/i;

function validateRule(input: string): string | null {
  const [ip, mask, extra] = input.split("/");
  if (extra !== undefined) return "Use one “/” at most, e.g. 10.0.0.0/8";
  const v4 = IPV4.test(ip);
  const v6 = !v4 && ip.includes(":") && IPV6.test(ip);
  if (!v4 && !v6) return "Enter an IPv4/IPv6 address or a CIDR range";
  if (mask !== undefined) {
    const n = Number(mask);
    const max = v4 ? 32 : 128;
    if (!/^\d+$/.test(mask) || n < 0 || n > max) return `Prefix must be between 0 and ${max}`;
  }
  return null;
}

function ipv4ToInt(ip: string) {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

/** True when `ip` is covered by `rule` (exact match, or IPv4 CIDR containment). */
function ruleCovers(rule: string, ip: string) {
  if (rule === ip) return true;
  const [base, maskStr] = rule.split("/");
  if (maskStr === undefined) return false;
  if (IPV4.test(base) && IPV4.test(ip)) {
    const mask = Number(maskStr);
    if (mask === 0) return true;
    const bits = (~0 << (32 - mask)) >>> 0;
    return (ipv4ToInt(base) & bits) === (ipv4ToInt(ip) & bits);
  }
  return false;
}

function describeRule(rule: string) {
  const [ip, mask] = rule.split("/");
  const v4 = IPV4.test(ip);
  if (mask === undefined) return { kind: v4 ? "IPv4" : "IPv6", detail: "Single address" };
  if (v4) {
    const size = 2 ** (32 - Number(mask));
    return {
      kind: "Range",
      detail: size === 1 ? "Single address" : `${size.toLocaleString()} addresses`,
    };
  }
  return { kind: "Range", detail: `IPv6 /${mask}` };
}

/* ---------------------------------- Card ---------------------------------- */

interface IpAllowlistCardProps {
  profile: UserProfile;
  onSave: (params: { allowedIps: string[]; enabled: boolean }) => Promise<unknown>;
  isPending: boolean;
}

export function IpAllowlistCard({ profile, onSave, isPending }: IpAllowlistCardProps) {
  const savedIps = useMemo(() => profile.allowedIps ?? [], [profile.allowedIps]);
  const savedEnabled = profile.ipWhitelistEnabled ?? false;

  const [ips, setIps] = useState<string[]>(savedIps);
  const [enabled, setEnabled] = useState(savedEnabled);
  const [draft, setDraft] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: myIp, isLoading: myIpLoading } = useMyIpQuery();

  const dirty = enabled !== savedEnabled || JSON.stringify(ips) !== JSON.stringify(savedIps);
  const enforcing = savedEnabled && savedIps.length > 0;
  const myIpCovered = myIp ? ips.some((rule) => ruleCovers(rule, myIp)) : true;
  const blockedEmpty = enabled && ips.length === 0;

  const addRule = (raw: string) => {
    const value = raw.trim().toLowerCase();
    if (!value) return;
    const problem = validateRule(value);
    if (problem) {
      setInputError(problem);
      return;
    }
    if (ips.includes(value)) {
      setInputError(`${value} is already on the list`);
      return;
    }
    setIps((prev) => [...prev, value]);
    setDraft("");
    setInputError(null);
  };

  const discard = () => {
    setIps(savedIps);
    setEnabled(savedEnabled);
    setDraft("");
    setInputError(null);
    setSaveError(null);
  };

  const save = async () => {
    setSaveError(null);
    try {
      await onSave({ allowedIps: ips, enabled });
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setSaveError(e?.response?.data?.message || e?.message || "Failed to update the allowlist");
    }
  };

  return (
    <section className="surface-card bg-card overflow-hidden rounded-xl border">
      {/* Header + master switch */}
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
              enforcing
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground bg-muted/50 border-[var(--hairline-strong)]",
            )}
          >
            <Network className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-foreground text-[15px] font-semibold">IP allowlist</h2>
              {enforcing ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3 w-3" /> Enforcing
                </span>
              ) : (
                <span className="bg-muted text-muted-foreground rounded-full border border-[var(--hairline)] px-2 py-0.5 text-[11px] font-medium">
                  Off · anyone can visit
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 max-w-xl text-[13px] leading-relaxed">
              Only visitors from these addresses can open your tunnel URLs. Everyone else gets a 403
              before the request reaches your machine. Applies to every tunnel on your account.
            </p>
          </div>
        </div>
        <label
          htmlFor="allowlist-enabled"
          className="flex shrink-0 cursor-pointer items-center gap-2.5 self-start rounded-lg border border-[var(--hairline-strong)] px-3 py-2 text-xs font-medium"
        >
          <span>{enabled ? "Enabled" : "Disabled"}</span>
          <Switch id="allowlist-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </label>
      </div>

      <div className="flex flex-col gap-4 border-t border-[var(--hairline)] p-5">
        {/* Add a rule */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addRule(draft);
          }}
          className="flex flex-col gap-2"
        >
          <label htmlFor="allowlist-input" className="text-foreground text-xs font-medium">
            Add an address or range
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="allowlist-input"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="203.0.113.7 or 10.0.0.0/8"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!inputError}
              aria-describedby={inputError ? "allowlist-input-error" : undefined}
              className="h-9 min-w-0 flex-1 font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button type="submit" variant="outline" className="h-9 flex-1 sm:flex-none">
                <Plus /> Add
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 sm:flex-none"
                disabled={!myIp || ips.includes(myIp)}
                onClick={() => myIp && addRule(myIp)}
                title={myIp ? `Add ${myIp}` : undefined}
              >
                {myIpLoading ? <Loader2 className="animate-spin" /> : <MapPin />}
                {myIp && ips.includes(myIp) ? "My IP added" : "Add my IP"}
              </Button>
            </div>
          </div>
          {inputError ? (
            <p id="allowlist-input-error" className="text-destructive text-xs">
              {inputError}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              {myIp ? (
                <>
                  You’re connecting from{" "}
                  <span className="text-foreground font-mono font-medium">{myIp}</span>.{" "}
                </>
              ) : null}
              CIDR ranges like <span className="font-mono">192.168.0.0/16</span> cover a whole
              network.
            </p>
          )}
        </form>

        {/* Rule list */}
        {ips.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-[var(--hairline-strong)] px-4 py-8 text-center">
            <Globe className="text-muted-foreground/50 mb-1 h-6 w-6" />
            <p className="text-foreground text-sm font-medium">No addresses yet</p>
            <p className="text-muted-foreground max-w-sm text-xs">
              Add your office, home or VPN address. Start with “Add my IP” if you’re not sure.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--hairline)] overflow-hidden rounded-lg border border-[var(--hairline-strong)]">
            {ips.map((rule) => {
              const info = describeRule(rule);
              const isMine = myIp ? ruleCovers(rule, myIp) : false;
              const unsaved = !savedIps.includes(rule);
              return (
                <li
                  key={rule}
                  className="hover:bg-muted/30 flex items-center gap-3 px-3.5 py-2.5 transition-colors"
                >
                  <span className="bg-muted text-muted-foreground w-12 shrink-0 rounded-md py-0.5 text-center font-mono text-[10px] font-semibold">
                    {info.kind}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate font-mono text-[13px] font-semibold">
                      {rule}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {info.detail}
                      {isMine && <span className="text-primary font-medium"> · includes you</span>}
                      {unsaved && (
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          {" "}
                          · not saved
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${rule}`}
                    onClick={() => setIps((prev) => prev.filter((r) => r !== rule))}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <X />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Warnings */}
        {blockedEmpty && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
            Add at least one address before turning the allowlist on.
          </div>
        )}
        {enabled && ips.length > 0 && myIp && !myIpCovered && (
          <div className="flex flex-col gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-700 sm:flex-row sm:items-center sm:justify-between dark:text-amber-300">
            <span className="flex items-start gap-2">
              <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
              Your current IP ({myIp}) isn’t on the list, so you won’t be able to open your own
              tunnels from this network.
            </span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => addRule(myIp)}
              className="self-start"
            >
              <Plus /> Add it
            </Button>
          </div>
        )}
        {saveError && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border p-3 text-xs">
            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
            {saveError}
          </div>
        )}
      </div>

      {/* Save bar */}
      <div
        className={cn(
          "flex flex-col gap-3 border-t border-[var(--hairline)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between",
          dirty ? "bg-amber-500/[0.06]" : "bg-muted/30",
        )}
      >
        <p className="text-muted-foreground text-xs" aria-live="polite">
          {dirty ? (
            <span className="font-medium text-amber-700 dark:text-amber-300">
              You have unsaved changes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              {savedIps.length} {savedIps.length === 1 ? "address" : "addresses"} saved
            </span>
          )}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={discard} disabled={!dirty || isPending}>
            Discard
          </Button>
          <Button onClick={save} disabled={!dirty || isPending || blockedEmpty}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </section>
  );
}
