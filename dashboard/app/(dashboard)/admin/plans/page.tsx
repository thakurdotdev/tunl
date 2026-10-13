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
        <Button
          nativeButton={false}
          render={<Link href="/admin/plans/new" />}
          size="sm"
          className="gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Create plan
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="h-52 animate-pulse">
              <CardContent className="space-y-4 p-5">
                <div className="bg-muted h-5 w-32 rounded" />
                <div className="bg-muted/70 h-4 w-full rounded" />
                <div className="bg-muted/70 h-4 w-2/3 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : plansList?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plansList.map((plan) => (
            <Card
              key={plan.id}
              className="hover:border-primary/30 gap-0 shadow-none transition-colors"
            >
              <CardHeader className="border-border/60 border-b pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="border-primary/20 bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg border">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="capitalize">{plan.name}</CardTitle>
                    </div>
                  </div>
                  {plan.isDefault && (
                    <Badge
                      variant="secondary"
                      className="gap-1 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Default
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <div className="bg-muted/40 flex items-center justify-between rounded-md px-3 py-2.5 text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Reserved subdomains
                  </span>
                  <span className="font-mono font-semibold">{plan.maxReservedSubdomains}</span>
                </div>
                <div className="bg-muted/40 flex items-center justify-between rounded-md px-3 py-2.5 text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Server className="h-4 w-4" /> Active tunnels
                  </span>
                  <span className="font-mono font-semibold">{plan.maxActiveTunnels}</span>
                </div>
                <div className="border-border/60 text-muted-foreground flex items-center justify-between border-t pt-3 text-xs">
                  <span>Created</span>
                  <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <Layers className="text-muted-foreground/50 mb-3 h-8 w-8" />
            <h3 className="font-medium">No plan tiers yet</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Create a tier to define account resource limits.
            </p>
            <Button
              nativeButton={false}
              render={<Link href="/admin/plans/new" />}
              size="sm"
              className="mt-4 gap-2"
            >
              <Plus className="h-4 w-4" /> Create plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
