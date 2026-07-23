"use client";

import { useAdminAnalytics } from "@/hooks/use-admin";
import { AdminAnalyticsCards } from "@/components/admin/admin-analytics-cards";
import { Button } from "@/components/ui/button";
import { Users, Layers, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AdminOverviewPage() {
  const { data: analytics, isLoading } = useAdminAnalytics();

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <AdminAnalyticsCards analytics={analytics} isLoading={isLoading} />

      {/* Quick Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-card border-border/80 rounded-lg border p-5 font-mono">
          <div className="flex items-center gap-2">
            <Users className="text-primary h-5 w-5" />
            <h3 className="text-sm font-bold">User Management Directory</h3>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Filter user accounts, assign custom subscription tiers, and manage administrative
            privileges.
          </p>
          <Link href="/admin/users" className="mt-4 inline-block">
            <Button size="sm" variant="outline" className="border-border text-xs">
              Manage Users <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="bg-card border-border/80 rounded-lg border p-5 font-mono">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-bold">Plan Tiers & Quotas</h3>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Configure system plan tiers, inspect resource caps, and define new subscription options.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Link href="/admin/plans">
              <Button size="sm" variant="outline" className="border-border text-xs">
                View Plans <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href="/admin/plans/new">
              <Button size="sm" className="text-xs">
                + Create Plan
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
