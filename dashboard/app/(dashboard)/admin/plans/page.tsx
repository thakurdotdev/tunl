"use client";

import { useAdminPlans } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Layers, Plus } from "lucide-react";
import Link from "next/link";

export default function AdminPlansPage() {
  const { data: plansList, isLoading } = useAdminPlans();

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground text-sm font-semibold">Subscription Plan Tiers</h2>
          <p className="text-muted-foreground text-xs">
            Manage system plan limits, default user tiers, and resource quotas.
          </p>
        </div>
        <Link href="/admin/plans/new">
          <Button size="sm" className="h-8 gap-1.5 px-3.5 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> Create Plan
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="text-muted-foreground col-span-full py-8 text-center text-xs">
            Querying plan tiers...
          </div>
        ) : (
          plansList?.map((plan) => (
            <div
              key={plan.id}
              className="bg-card border-border/60 flex flex-col justify-between rounded-lg border p-5 shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="text-muted-foreground h-4 w-4" />
                    <h3 className="text-foreground text-sm font-semibold capitalize">
                      {plan.name} Tier
                    </h3>
                  </div>
                  {plan.isDefault && (
                    <span className="flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Default Tier
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2.5 font-sans text-xs">
                  <div className="border-border/60 flex items-center justify-between border-b pb-2">
                    <span className="text-muted-foreground">Max Subdomains</span>
                    <span className="text-foreground font-mono font-semibold">
                      {plan.maxReservedSubdomains}
                    </span>
                  </div>
                  <div className="border-border/60 flex items-center justify-between border-b pb-2">
                    <span className="text-muted-foreground">Max Active Tunnels</span>
                    <span className="text-foreground font-mono font-semibold">
                      {plan.maxActiveTunnels}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-muted-foreground">Created</span>
                    <span className="text-muted-foreground">
                      {new Date(plan.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
