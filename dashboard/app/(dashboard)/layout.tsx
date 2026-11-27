"use client";

import { PortalShell } from "@/components/portal/portal-shell";
import { RouteGuard } from "@/components/route-guard";
import "./dashboard.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <PortalShell>{children}</PortalShell>
    </RouteGuard>
  );
}
