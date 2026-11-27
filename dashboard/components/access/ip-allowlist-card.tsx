"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useMyIpQuery, type UserProfile } from "@/hooks/use-profile";
import { AlertCircle, AlertTriangle, Loader2, MapPin, Plus, ShieldCheck, X } from "lucide-react";
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
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-foreground text-[15px] font-semibold">IP allowlist</h2>
            {enforcing ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" /> On
              </span>
            ) : (
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
                Off
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Only these IPs can open your tunnels.
          </p>
        </div>
        <Switch
          id="allowlist-enabled"
          aria-label="Enforce IP allowlist"
          checked={enabled}
          onCheckedChange={setEnabled}
          className="mt-1"
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--hairline)] p-5">
        {/* Add a rule */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addRule(draft);
          }}
          className="flex flex-col gap-1.5"
        >
          <label htmlFor="allowlist-input" className="sr-only">
            IP address or CIDR range
          </label>
          <div className="flex gap-2">
            <Input
              id="allowlist-input"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="IP or range, e.g. 10.0.0.0/8"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!inputError}
              aria-describedby={inputError ? "allowlist-input-error" : undefined}
              className="h-9 min-w-0 flex-1 font-mono text-sm"
            />
            <Button type="submit" variant="outline" className="h-9" aria-label="Add address">
              <Plus /> <span className="max-sm:hidden">Add</span>
            </Button>
          </div>
          {inputError && (
            <p id="allowlist-input-error" className="text-destructive text-xs">
              {inputError}
            </p>
          )}
        </form>

        {myIp && !ips.includes(myIp) && (
          <button
            type="button"
            onClick={() => addRule(myIp)}
            className="text-primary inline-flex items-center gap-1.5 self-start text-xs font-medium hover:underline"
          >
            <MapPin className="h-3.5 w-3.5" />
            Add my IP <span className="text-muted-foreground font-mono">{myIp}</span>
          </button>
        )}
        {myIpLoading && (
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding your IP…
          </span>
        )}

        {/* Rule list */}
        {ips.length > 0 && (
          <ul className="divide-y divide-[var(--hairline)] overflow-hidden rounded-lg border border-[var(--hairline-strong)]">
            {ips.map((rule) => {
              const info = describeRule(rule);
              const isMine = myIp ? ruleCovers(rule, myIp) : false;
              const unsaved = !savedIps.includes(rule);
              return (
                <li key={rule} className="flex items-center gap-2 py-1.5 pr-1.5 pl-3.5">
                  <span className="text-foreground min-w-0 truncate font-mono text-[13px] font-medium">
                    {rule}
                  </span>
                  {info.kind === "Range" && (
                    <span className="text-muted-foreground hidden text-[11px] sm:inline">
                      {info.detail}
                    </span>
                  )}
                  {isMine && (
                    <span className="bg-primary/10 text-primary rounded-full px-1.5 py-px text-[10px] font-semibold">
                      you
                    </span>
                  )}
                  {unsaved && (
                    <span className="rounded-full bg-amber-500/10 px-1.5 py-px text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                      new
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${rule}`}
                    onClick={() => setIps((prev) => prev.filter((r) => r !== rule))}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-auto"
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
          <p className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Add an address before turning this on.
          </p>
        )}
        {enabled && ips.length > 0 && myIp && !myIpCovered && (
          <p className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Your IP isn’t listed, so you’ll be locked out of your own tunnels.
          </p>
        )}
        {saveError && (
          <p className="text-destructive flex items-center gap-2 text-xs">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {saveError}
          </p>
        )}
      </div>

      {/* Save bar: only while there is something to save */}
      {dirty && (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--hairline)] bg-amber-500/[0.06] px-5 py-3">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300" aria-live="polite">
            Unsaved changes
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={discard} disabled={isPending}>
              Discard
            </Button>
            <Button size="sm" onClick={save} disabled={isPending || blockedEmpty}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
