"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreatePlan } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

export default function CreatePlanPage() {
  const router = useRouter();
  const createPlan = useCreatePlan();

  const [name, setName] = useState("");
  const [maxReservedSubdomains, setMaxReservedSubdomains] = useState(1);
  const [maxActiveTunnels, setMaxActiveTunnels] = useState(1);
  const [maxCustomDomains, setMaxCustomDomains] = useState(1);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    createPlan.mutate(
      {
        name: name.trim().toLowerCase(),
        maxReservedSubdomains,
        maxActiveTunnels,
        maxCustomDomains,
        isDefault,
      },
      {
        onSuccess: () => {
          router.push("/admin/plans");
        },
        onError: (err: any) => {
          setError(err?.message || "Failed to create plan");
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 font-sans">
      <div className="flex items-start gap-3">
        <Button
          nativeButton={false}
          render={<Link href="/admin/plans" aria-label="Back to plan tiers" />}
          size="icon"
          variant="ghost"
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Create plan tier</h2>
        </div>
      </div>

      <Card className="gap-0 shadow-none">
        <CardHeader className="border-border/60 border-b">
          <CardTitle>Plan details</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {error && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive mb-4 flex items-center gap-2 rounded-lg border p-3 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="plan-name" className="text-foreground block text-sm font-medium">
                Plan Name (Slug)
              </Label>
              <Input
                type="text"
                id="plan-name"
                placeholder="e.g. enterprise, developer, team"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase())}
                required
                className="mt-1 font-mono text-xs"
              />
              <span className="text-muted-foreground mt-1 block text-xs">
                Must be lowercase letters, numbers, or hyphens (e.g. <code>pro-plus</code>)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label
                  htmlFor="max-subdomains"
                  className="text-foreground block text-sm font-medium"
                >
                  Max Reserved Subdomains
                </Label>
                <Input
                  type="number"
                  id="max-subdomains"
                  min={1}
                  value={maxReservedSubdomains}
                  onChange={(e) => setMaxReservedSubdomains(parseInt(e.target.value) || 1)}
                  required
                  className="mt-1 font-mono text-xs"
                />
                <span className="text-muted-foreground mt-1 block text-xs">
                  Subdomain alias cap
                </span>
              </div>
              <div>
                <Label htmlFor="max-tunnels" className="text-foreground block text-sm font-medium">
                  Max Active Tunnels
                </Label>
                <Input
                  type="number"
                  id="max-tunnels"
                  min={1}
                  value={maxActiveTunnels}
                  onChange={(e) => setMaxActiveTunnels(parseInt(e.target.value) || 1)}
                  required
                  className="mt-1 font-mono text-xs"
                />
                <span className="text-muted-foreground mt-1 block text-xs">
                  Concurrent live SSH sessions
                </span>
              </div>
              <div>
                <Label htmlFor="max-domains" className="text-foreground block text-sm font-medium">
                  Max Custom Domains
                </Label>
                <Input
                  type="number"
                  id="max-domains"
                  min={0}
                  value={maxCustomDomains}
                  onChange={(e) => setMaxCustomDomains(Math.max(0, parseInt(e.target.value) || 0))}
                  required
                  className="mt-1 font-mono text-xs"
                />
                <span className="text-muted-foreground mt-1 block text-xs">
                  0 disables the feature
                </span>
              </div>
            </div>

            <div className="border-border/60 flex items-center gap-2 border-t pt-4">
              <Checkbox
                id="isDefaultPlan"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              <Label htmlFor="isDefaultPlan" className="text-foreground cursor-pointer text-sm">
                Set as default plan assigned to newly registered users
              </Label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                nativeButton={false}
                render={<Link href="/admin/plans" />}
                type="button"
                variant="outline"
                className="border-border text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createPlan.isPending} className="text-xs">
                {createPlan.isPending ? (
                  "Creating Plan..."
                ) : (
                  <>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Save New Plan
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
