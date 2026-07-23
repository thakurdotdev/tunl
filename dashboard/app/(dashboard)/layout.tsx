"use client";

import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { RouteGuard } from "@/components/route-guard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./dashboard.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "0:tunnels", pathMatch: "/dashboard" },
    { href: "/keys", label: "1:ssh-keys", pathMatch: "/keys" },
  ];

  return (
    <RouteGuard>
      <div className="bg-background flex min-h-screen flex-col font-mono">
        <header className="border-border bg-card/90 sticky top-0 z-50 border-b backdrop-blur-xs">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <div className="flex items-center gap-3 overflow-hidden sm:gap-6">
              <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
                <Logo />
              </Link>
              <div className="bg-border/60 hidden h-4 w-px shrink-0 sm:block" />
              <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto py-1 sm:gap-1.5">
                {navItems.map((item) => {
                  const isActive = pathname === item.pathMatch;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center rounded-md px-2 py-1 font-mono text-[11px] whitespace-nowrap transition-all sm:px-2.5 sm:text-xs ${
                        isActive
                          ? "bg-primary/15 text-primary border-primary/30 border font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span className="opacity-60">{isActive ? "> " : ""}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs sm:gap-3">
              <div className="border-border bg-muted/40 hidden items-center gap-2 rounded-md border px-2.5 py-1 md:flex">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-muted-foreground font-mono text-[11px]">SSH:2222 READY</span>
              </div>
              <span className="text-muted-foreground hidden font-mono text-xs lg:inline">
                {user?.email}
              </span>
              <ModeToggle />
              <Button variant="outline" size="xs" onClick={logout} className="font-mono text-xs">
                [exit]
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      </div>
    </RouteGuard>
  );
}
