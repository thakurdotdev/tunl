"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { RouteGuard } from "@/components/route-guard";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import "./dashboard.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <RouteGuard>
      <div className="bg-background flex min-h-screen flex-col">
        <header className="border-border bg-card border-b">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <div className="flex items-center gap-8">
              <Link href="/dashboard">
                <Logo />
              </Link>
              <nav className="flex items-center gap-6">
                <Link
                  href="/dashboard"
                  className={`text-sm transition-colors ${
                    pathname === "/dashboard"
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Tunnels
                </Link>
                <Link
                  href="/keys"
                  className={`text-sm transition-colors ${
                    pathname === "/keys"
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  SSH Keys
                </Link>
                <Link
                  href="/docs"
                  className={`text-sm transition-colors ${
                    pathname === "/docs"
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Docs
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground hidden text-sm sm:inline">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={logout}>
                Log out
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      </div>
    </RouteGuard>
  );
}
