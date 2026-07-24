"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck, BarChart3, Users, Layers, Plus } from "lucide-react";
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
    { href: "/admin/plans", label: "Plan Tiers", icon: Layers },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Admin Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-foreground text-2xl font-bold tracking-tight">Admin Console</h1>
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-400">
              <ShieldCheck className="h-3 w-3" /> ADMIN GRANTED
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            System health analytics, user management, and subscription plan tiers.
          </p>
        </div>

        <Link href="/admin/plans/new">
          <Button
            size="sm"
            variant="default"
            className="h-9 px-3.5 text-xs font-semibold shadow-xs"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Plan Tier
          </Button>
        </Link>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="border-border/60 flex items-center gap-1.5 border-b pb-1">
        {adminTabs.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary/10 text-primary border-primary/20 border font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div>{children}</div>
    </div>
  );
}
