"use client";

import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { RouteGuard } from "@/components/route-guard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./dashboard.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Tunnels", pathMatch: "/dashboard" },
    { href: "/keys", label: "SSH Keys", pathMatch: "/keys" },
    { href: "/inspect", label: "Inspect", pathMatch: "/inspect" },
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin", pathMatch: "/admin" }] : []),
  ];

  return (
    <RouteGuard>
      <div className="bg-background flex min-h-screen flex-col font-sans">
        <header className="border-border/60 bg-card/90 sticky top-0 z-50 border-b backdrop-blur-xs">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
            <div className="flex items-center gap-2 overflow-hidden sm:gap-6">
              <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
                <Logo />
              </Link>
              <div className="bg-border/60 hidden h-4 w-px shrink-0 sm:block" />
              <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto py-1 sm:gap-1.5">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.pathMatch);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors sm:px-3 sm:py-1.5 ${
                        isActive
                          ? "bg-secondary text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-xs sm:gap-3">
              <Link
                href="/profile"
                title="Account Settings"
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors sm:px-2.5 ${
                  pathname.startsWith("/profile")
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden font-sans text-xs sm:inline">{user?.email}</span>
              </Link>
              <ModeToggle />
              <Button variant="outline" size="xs" onClick={logout} className="shrink-0 text-xs">
                Sign Out
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </RouteGuard>
  );
}
