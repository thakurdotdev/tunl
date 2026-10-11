"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const activeTab =
    adminTabs.find((tab) =>
      tab.exact ? pathname === tab.href : pathname.startsWith(tab.href),
    )?.href ?? "/admin";

  return (
    <div className="font-sans">
      <Tabs value={activeTab} className="mb-6">
        <TabsList className="no-scrollbar w-full overflow-x-auto sm:w-fit">
          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.href}
                value={tab.href}
                render={<Link href={tab.href} />}
              >
                <Icon />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

