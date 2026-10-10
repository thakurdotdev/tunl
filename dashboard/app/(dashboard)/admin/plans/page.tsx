"use client";

import { useAdminPlans } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Layers, Plus, Server, Globe } from "lucide-react";
import Link from "next/link";

export default function AdminPlansPage() {
  const { data: plansList, isLoading } = useAdminPlans();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Plan tiers</h2>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/plans/new" />} size="sm" className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Create plan
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="h-52 animate-pulse"><CardContent className="space-y-4 p-5"><div className="h-5 w-32 rounded bg-muted" /><div className="h-4 w-full rounded bg-muted/70" /><div className="h-4 w-2/3 rounded bg-muted/70" /></CardContent></Card>
          ))}
        </div>
      ) : plansList?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plansList.map((plan) => (
            <Card key={plan.id} className="gap-0 shadow-none transition-colors hover:border-primary/30">
              <CardHeader className="border-b border-border/60 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary"><Layers className="h-5 w-5" /></div>
                    <div>
                      <CardTitle className="capitalize">{plan.name}</CardTitle>
                    </div>
                  </div>
                  {plan.isDefault && <Badge variant="secondary" className="gap-1 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Default</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2.5 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground"><Globe className="h-4 w-4" /> Reserved subdomains</span>
                  <span className="font-mono font-semibold">{plan.maxReservedSubdomains}</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2.5 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground"><Server className="h-4 w-4" /> Active tunnels</span>
                  <span className="font-mono font-semibold">{plan.maxActiveTunnels}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span>Created</span><span>{new Date(plan.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <Layers className="mb-3 h-8 w-8 text-muted-foreground/50" />
            <h3 className="font-medium">No plan tiers yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create a tier to define account resource limits.</p>
            <Button nativeButton={false} render={<Link href="/admin/plans/new" />} size="sm" className="mt-4 gap-2"><Plus className="h-4 w-4" /> Create plan</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
