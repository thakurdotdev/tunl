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

/** Expands an IPv6 address to its 8 hextets, or null when it isn't one. */
function ipv6Hextets(ip: string): number[] | null {
  let addr = ip.toLowerCase().split("%")[0];
  // Trailing embedded IPv4 (e.g. ::ffff:1.2.3.4) becomes two hextets.
  const v4 = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    if (!IPV4.test(v4[1])) return null;
    const n = ipv4ToInt(v4[1]);
    addr = `${addr.slice(0, -v4[1].length)}${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const parts = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  if (parts.some((p) => !/^[0-9a-f]{1,4}$/.test(p))) return null;
  return parts.map((p) => parseInt(p, 16));
}

function ipv6ToBigInt(ip: string): bigint | null {
  const h = ipv6Hextets(ip);
  return h ? h.reduce((acc, part) => (acc << BigInt(16)) + BigInt(part), BigInt(0)) : null;
}

/** True when `ip` is covered by `rule` (exact match, or IPv4/IPv6 CIDR containment). */
function ruleCovers(rule: string, ip: string) {
  if (rule === ip) return true;
  const [base, maskStr] = rule.split("/");
  if (IPV4.test(base) && IPV4.test(ip)) {
    if (maskStr === undefined) return false;
    const mask = Number(maskStr);
    if (mask === 0) return true;
    const bits = (~0 << (32 - mask)) >>> 0;
    return (ipv4ToInt(base) & bits) === (ipv4ToInt(ip) & bits);
  }
  const a = ipv6ToBigInt(base);
  const b = ipv6ToBigInt(ip);
  if (a === null || b === null) return false;
  const mask = maskStr === undefined ? 128 : Number(maskStr);
  const shift = BigInt(128 - mask);
  return a >> shift === b >> shift;
}

/** The rule to suggest for an IP: IPv4 as-is, IPv6 as its /64 network. */
function suggestedRule(ip: string): { rule: string; isV6Network: boolean } {
  const h = ipv6Hextets(ip);
  if (!h) return { rule: ip, isV6Network: false };
  return {
    rule: `${h
      .slice(0, 4)
      .map((x) => x.toString(16))
      .join(":")}::/64`,
    isV6Network: true,
  };
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

  const { data: ipInfo, isLoading: myIpLoading } = useMyIpQuery();
  // What tunnels will see; the dashboard API's view is only a fallback.
  const myIp = ipInfo?.tunnelIp ?? ipInfo?.dashboardIp ?? null;
  const suggestion = myIp ? suggestedRule(myIp) : null;
  const otherIp =
    ipInfo?.tunnelIp &&
    ipInfo.dashboardIp &&
    ipInfo.dashboardIp !== ipInfo.tunnelIp &&
    IPV4.test(ipInfo.dashboardIp) !== IPV4.test(ipInfo.tunnelIp)
      ? ipInfo.dashboardIp
      : null;

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

        {suggestion && !myIpCovered && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => addRule(suggestion.rule)}
              className="text-primary inline-flex items-center gap-1.5 self-start text-xs font-medium hover:underline"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {suggestion.isV6Network ? "Add my network" : "Add my IP"}
              <span className="text-muted-foreground font-mono break-all">{suggestion.rule}</span>
            </button>
            {suggestion.isV6Network && (
              <p className="text-muted-foreground pl-5 text-[11px]">
                You reach tunnels over IPv6, and the end of that address changes often.
              </p>
            )}
          </div>
        )}
        {otherIp && !ips.some((rule) => ruleCovers(rule, otherIp)) && (
          <button
            type="button"
            onClick={() => addRule(otherIp)}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-start pl-5 text-[11px] hover:underline"
          >
            <Plus className="h-3 w-3" /> Also add your IPv4{" "}
            <span className="font-mono">{otherIp}</span>
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
          <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            Add an address before turning this on.
          </p>
        )}
        {enabled && ips.length > 0 && myIp && !myIpCovered && (
          <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            Your current IP ({myIp}) isn’t covered, so you’ll be locked out of your own tunnels.
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
