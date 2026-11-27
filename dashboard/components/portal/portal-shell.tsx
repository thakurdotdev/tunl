"use client";

import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useTunnelsQuery } from "@/hooks/use-tunnels";
import { useAuth } from "@/lib/auth-context";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ChevronsUpDown,
  Eye,
  Globe,
  KeyRound,
  Link2,
  LogOut,
  Menu,
  Shield,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Small status text shown on the right of the item. */
  hint?: React.ReactNode;
};

type NavGroup = { label: string; items: NavItem[] };

function getInitials(name?: string | null, email?: string | null) {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    return (parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : trimmed[0]).toUpperCase();
  }
  return email?.trim()?.[0]?.toUpperCase() ?? "U";
}

function Avatar({ user, className }: { user: User | null; className?: string }) {
  if (user?.image) {
    return (
      <img
        src={user.image}
        alt=""
        className={cn(
          "shrink-0 rounded-full border border-[var(--hairline)] object-cover",
          className,
        )}
      />
    );
  }
  return (
    <span
      className={cn(
        "bg-secondary text-foreground flex shrink-0 items-center justify-center rounded-full border border-[var(--hairline)] text-[11px] font-bold",
        className,
      )}
    >
      {getInitials(user?.name, user?.email)}
    </span>
  );
}

function useNavGroups(user: User | null): NavGroup[] {
  const allowlistOn = Boolean(user?.ipWhitelistEnabled && user?.allowedIps?.length);
  const groups: NavGroup[] = [
    {
      label: "Tunnels",
      items: [
        { href: "/dashboard", label: "Tunnels", icon: Globe },
        { href: "/inspect", label: "Inspect", icon: Eye },
        { href: "/domains", label: "Custom domains", icon: Link2 },
      ],
    },
    {
      label: "Security",
      items: [
        {
          href: "/access",
          label: "Access control",
          icon: ShieldCheck,
          hint: allowlistOn ? (
            <span title="IP allowlist is on" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          ) : undefined,
        },
        { href: "/keys", label: "SSH keys", icon: KeyRound },
        { href: "/profile", label: "Settings", icon: UserCog },
      ],
    },
  ];
  if (user?.role === "admin") {
    groups.push({
      label: "Admin",
      items: [{ href: "/admin", label: "Admin console", icon: Shield }],
    });
  }
  return groups;
}

function NavLinks({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col">
      {groups.map((group, i) => (
        <div
          key={group.label}
          role="group"
          aria-label={group.label}
          className={cn(
            "flex flex-col gap-0.5",
            i > 0 && "mt-3 border-t border-[var(--hairline)] pt-3",
          )}
        >
          {group.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-[color,background-color,box-shadow]",
                  active
                    ? "bg-card text-foreground shadow-[inset_0_1px_0_var(--highlight),0_0_0_1px_var(--hairline),0_1px_2px_color-mix(in_oklab,var(--scrim)_12%,transparent)] dark:bg-[color-mix(in_oklab,var(--foreground)_8%,var(--card))]"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active
                      ? "text-primary"
                      : "text-muted-foreground/80 group-hover:text-foreground",
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function PlanUsage() {
  const { user } = useAuth();
  const { data: tunnels } = useTunnelsQuery();
  const max = user?.plan?.maxReservedSubdomains ?? 1;
  const used = tunnels?.length ?? 0;
  const pct = Math.min(100, Math.round((used / Math.max(max, 1)) * 100));
  return (
    <div className="px-1 pb-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">
          <span className="text-foreground font-medium capitalize">
            {user?.plan?.name ?? "Free"}
          </span>{" "}
          · subdomains
        </span>
        <span className="text-muted-foreground tabular-nums">
          {tunnels ? used : "–"}/{max}
        </span>
      </div>
      <div
        className="bg-muted mt-1.5 h-1 overflow-hidden rounded-full"
        role="progressbar"
        aria-label="Reserved subdomains used"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={used}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            pct >= 100 ? "bg-amber-500" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  const displayName = user?.name?.trim() || null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          compact ? (
            <Button
              variant="outline"
              size="icon"
              aria-label="Account menu"
              className="overflow-hidden rounded-full p-0"
            >
              <Avatar user={user} className="h-full w-full border-0" />
            </Button>
          ) : (
            <button
              type="button"
              aria-label="Account menu"
              className="hover:bg-muted/70 aria-expanded:bg-muted/70 flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors"
            >
              <Avatar user={user} className="h-8 w-8" />
              <span className="min-w-0 flex-1">
                <span className="text-foreground block truncate text-[13px] font-semibold">
                  {displayName ?? user?.email}
                </span>
                {displayName && (
                  <span className="text-muted-foreground block truncate text-[11px]">
                    {user?.email}
                  </span>
                )}
              </span>
              <ChevronsUpDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            </button>
          )
        }
      />
      <DropdownMenuContent
        align={compact ? "end" : "start"}
        side={compact ? "bottom" : "top"}
        className="w-60 p-1"
      >
        <div className="flex items-center gap-2.5 px-2.5 py-2 text-xs">
          <Avatar user={user} className="h-8 w-8" />
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate font-semibold">{displayName ?? user?.email}</p>
            {displayName && (
              <p className="text-muted-foreground truncate text-[11px]">{user?.email}</p>
            )}
            <p className="text-muted-foreground mt-0.5 text-[10px] capitalize">
              {user?.role || "user"}
              {user?.plan?.name ? ` · ${user.plan.name}` : ""}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href="/profile" className="flex w-full items-center gap-2 text-xs font-medium">
              <UserCog className="text-muted-foreground h-3.5 w-3.5" />
              Settings
            </Link>
          }
        />
        <DropdownMenuItem
          render={
            <Link href="/access" className="flex w-full items-center gap-2 text-xs font-medium">
              <ShieldCheck className="text-muted-foreground h-3.5 w-3.5" />
              Access control
            </Link>
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={logout}
          className="flex items-center gap-2 text-xs font-medium"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const groups = useNavGroups(user);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="bg-background flex min-h-screen font-sans">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--hairline)] bg-[color-mix(in_oklab,var(--foreground)_1.5%,var(--background))] lg:flex">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" aria-label="tunl home">
            <Logo />
          </Link>
          <ModeToggle variant="ghost" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pt-3 pb-4">
          <NavLinks groups={groups} />
        </div>
        <div className="flex flex-col gap-3 border-t border-[var(--hairline)] p-3">
          <PlanUsage />
          <UserMenu />
        </div>
      </aside>

      {/* Main column */}
      <div className="portal-ambient flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="bg-background/90 sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-[var(--hairline)] px-3 backdrop-blur-md sm:px-4 lg:hidden">
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-4.5 w-4.5" />
            </Button>
            <Link href="/dashboard" aria-label="tunl home">
              <Logo />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <UserMenu compact />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] gap-0 p-0 lg:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-14 items-center border-b border-[var(--hairline)] px-4">
            <Logo />
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <NavLinks groups={groups} onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="border-t border-[var(--hairline)] p-3">
            <PlanUsage />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
