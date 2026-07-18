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
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b border-border bg-card">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
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
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                Log out
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">{children}</main>
      </div>
    </RouteGuard>
  );
}
