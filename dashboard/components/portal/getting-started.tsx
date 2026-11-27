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
  description: string;
  done: boolean;
  href: string;
  cta: string;
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
      description: "Your key is how tunl knows the tunnel is yours.",
      done: keys.data.length > 0,
      href: "/keys",
      cta: "Add key",
    },
    {
      title: "Reserve a subdomain",
      description: "Claim a stable name like my-app.tunl.online.",
      done: tunnelList.length > 0,
      href: "#subdomain",
      cta: "Reserve",
    },
    {
      title: "Connect your first tunnel",
      description: "Run the quick-connect command on the machine running your app.",
      done: sessions.data.length > 0 || tunnelList.some((t) => t.lastConnectedAt),
      href: "#quick-connect",
      cta: "Get command",
    },
    {
      title: "Decide who can visit",
      description: "Allow only your IPs, or put a password on a tunnel.",
      done:
        Boolean(user?.ipWhitelistEnabled && user?.allowedIps?.length) ||
        tunnelList.some((t) => t.hasPassword || t.password),
      href: "/access",
      cta: "Set up access",
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
      className="surface-card bg-card relative overflow-hidden rounded-xl border"
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          <h2 id="getting-started-title" className="text-foreground text-sm font-semibold">
            Get set up
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {completed} of {steps.length} done
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-muted hidden h-1.5 w-28 overflow-hidden rounded-full sm:block">
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-500"
              style={{ width: `${(completed / steps.length) * 100}%` }}
            />
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Hide setup checklist"
            onClick={dismiss}
          >
            <X />
          </Button>
        </div>
      </div>
      <ol className="grid border-t border-[var(--hairline)] sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, i) => {
          const isNext = i === nextIndex;
          return (
            <li
              key={step.title}
              className={cn(
                "flex gap-3 border-[var(--hairline)] p-4 max-sm:not-last:border-b sm:max-xl:odd:border-r xl:not-last:border-r sm:max-xl:[&:nth-child(-n+2)]:border-b",
                isNext && "bg-primary/[0.04]",
              )}
            >
              <span
                className={cn(
                  "mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                  step.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : isNext
                      ? "border-primary text-primary"
                      : "text-muted-foreground border-[var(--hairline-strong)]",
                )}
              >
                {step.done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[13px] font-medium",
                    step.done ? "text-muted-foreground line-through" : "text-foreground",
                  )}
                >
                  {step.title}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  {step.description}
                </p>
                {!step.done && (
                  <Link
                    href={step.href}
                    className={cn(
                      "mt-2 inline-flex items-center gap-1 text-xs font-medium",
                      isNext ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {step.cta} <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
