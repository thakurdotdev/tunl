"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { Activity, BarChart3, Layers, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (isAuthLoading) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        Loading security credentials...
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="border-destructive/30 bg-destructive/10 mx-auto my-12 max-w-md rounded-xl border p-6 text-center">
        <ShieldAlert className="text-destructive mx-auto mb-3 h-10 w-10" />
        <h2 className="text-foreground text-base font-bold">403 — Access Forbidden</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          You do not have administrative privileges to access this control section.
        </p>
        <Button
          onClick={() => router.push("/dashboard")}
          variant="outline"
          className="border-border mt-4 text-xs"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const adminTabs = [
    { href: "/admin", label: "Overview", icon: BarChart3, exact: true },
    { href: "/admin/users", label: "User Directory", icon: Users },
    { href: "/admin/audit", label: "Audit Stream", icon: Activity },
    { href: "/admin/plans", label: "Plan Tiers", icon: Layers },
  ];

  return (
    <div className="font-sans">
      <div className="grid items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        <Card className="p-2 lg:sticky lg:top-20">
          <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto lg:flex-col">
            {adminTabs.map((tab) => {
              const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </Card>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
