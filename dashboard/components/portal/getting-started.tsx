"use client";

import { Button } from "@/components/ui/button";
import { useSshKeysQuery } from "@/hooks/use-ssh-keys";
import { useTunnelSessionsQuery, useTunnelsQuery } from "@/hooks/use-tunnels";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, X } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const DISMISS_KEY = "tunl_getting_started_dismissed";

const subscribeNoop = () => () => {};
function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

type Step = {
  title: string;
  done: boolean;
  href: string;
};

/** Setup checklist on the Tunnels page; hides itself once every step is done. */
export function GettingStarted() {
  const { user } = useAuth();
  const keys = useSshKeysQuery();
  const tunnels = useTunnelsQuery();
  const sessions = useTunnelSessionsQuery();
  const storedDismissed = useSyncExternalStore(subscribeNoop, readDismissed, () => true);
  const [dismissedNow, setDismissedNow] = useState(false);
  const dismissed = storedDismissed || dismissedNow;

  if (dismissed || !keys.data || !tunnels.data || !sessions.data) return null;

  const tunnelList = tunnels.data;
  const steps: Step[] = [
    {
      title: "Add an SSH key",
      done: keys.data.length > 0,
      href: "/keys",
    },
    {
      title: "Reserve a subdomain",
      done: tunnelList.length > 0,
      href: "#subdomain",
    },
    {
      title: "Connect a tunnel",
      done: sessions.data.length > 0 || tunnelList.some((t) => t.lastConnectedAt),
      href: "#quick-connect",
    },
    {
      title: "Restrict access",
      done:
        Boolean(user?.ipWhitelistEnabled && user?.allowedIps?.length) ||
        tunnelList.some((t) => t.hasPassword || t.password),
      href: "/access",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;
  const nextIndex = steps.findIndex((s) => !s.done);

  const dismiss = () => {
    setDismissedNow(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  return (
    <section
      aria-labelledby="getting-started-title"
      className="surface-card bg-card flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-4 sm:pl-4"
    >
      <div className="flex items-center justify-between gap-3 sm:block">
        <h2
          id="getting-started-title"
          className="text-foreground text-sm font-semibold whitespace-nowrap"
        >
          Get set up{" "}
          <span className="text-muted-foreground font-normal tabular-nums">
            {completed}/{steps.length}
          </span>
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Hide setup checklist"
          onClick={dismiss}
          className="sm:hidden"
        >
          <X />
        </Button>
      </div>
      <ol className="flex min-w-0 flex-1 flex-wrap gap-2">
        {steps.map((step, i) => {
          const isNext = i === nextIndex;
          const content = (
            <>
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
                  step.done
                    ? "bg-primary text-primary-foreground"
                    : isNext
                      ? "border-primary text-primary border"
                      : "text-muted-foreground border border-[var(--hairline-strong)]",
                )}
              >
                {step.done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn(step.done && "line-through")}>{step.title}</span>
              {isNext && <ArrowRight className="h-3 w-3" />}
            </>
          );
          const base =
            "flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors";
          return (
            <li key={step.title}>
              {step.done ? (
                <span className={cn(base, "text-muted-foreground border-transparent")}>
                  {content}
                </span>
              ) : (
                <Link
                  href={step.href}
                  className={cn(
                    base,
                    isNext
                      ? "border-primary/40 bg-primary/[0.06] text-primary hover:bg-primary/10"
                      : "text-muted-foreground hover:text-foreground border-[var(--hairline)] hover:border-[var(--hairline-strong)]",
                  )}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Hide setup checklist"
        onClick={dismiss}
        className="hidden shrink-0 sm:inline-flex"
      >
        <X />
      </Button>
    </section>
  );
}
