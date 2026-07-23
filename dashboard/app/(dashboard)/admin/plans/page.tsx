"use client";

import { useAdminPlans } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Layers, Plus } from "lucide-react";
import Link from "next/link";

export default function AdminPlansPage() {
  const { data: plansList, isLoading } = useAdminPlans();

  return (
    <div className="space-y-6 font-mono">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">Subscription Plan Tiers</h2>
          <p className="text-muted-foreground text-xs">
            Manage system plan limits, default user tiers, and resource quotas.
          </p>
        </div>
        <Link href="/admin/plans/new">
          <Button size="sm" className="text-xs">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Plan
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
              className="bg-card border-border/80 hover:border-primary/50 relative flex flex-col justify-between rounded-xl border p-5 shadow-xs transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-purple-400" />
                    <h3 className="text-foreground text-base font-bold uppercase">{plan.name}</h3>
                  </div>
                  {plan.isDefault && (
                    <span className="flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> DEFAULT TIER
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="border-border/40 flex items-center justify-between border-b pb-2">
                    <span className="text-muted-foreground">Max Subdomains:</span>
                    <strong className="text-foreground font-semibold">
                      {plan.maxReservedSubdomains}
                    </strong>
                  </div>
                  <div className="border-border/40 flex items-center justify-between border-b pb-2">
                    <span className="text-muted-foreground">Max Active Tunnels:</span>
                    <strong className="text-foreground font-semibold">
                      {plan.maxActiveTunnels}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-muted-foreground">Created:</span>
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
