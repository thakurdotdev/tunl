"use client";

import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col gap-6 font-sans">
      {/* Admin Header Bar */}
      <div className="border-border/60 flex flex-col gap-1 border-b pb-5">
        <h1 className="text-foreground text-xl font-bold tracking-tight">Admin Console</h1>
        <p className="text-muted-foreground text-xs">
          System telemetry, user directory, audit logs, and subscription plan tiers.
        </p>
      </div>

      {/* Admin Sub-Navigation Tabs */}
      <nav className="border-border/60 no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b pb-3 text-xs">
        {adminTabs.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
