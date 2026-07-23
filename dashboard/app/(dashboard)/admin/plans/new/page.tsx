"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreatePlan } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

export default function CreatePlanPage() {
  const router = useRouter();
  const createPlan = useCreatePlan();

  const [name, setName] = useState("");
  const [maxReservedSubdomains, setMaxReservedSubdomains] = useState(1);
  const [maxActiveTunnels, setMaxActiveTunnels] = useState(1);
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
    <div className="mx-auto max-w-xl space-y-6 font-mono">
      <div className="flex items-center gap-3">
        <Link href="/admin/plans">
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-base font-bold">Create Subscription Plan Tier</h2>
          <p className="text-muted-foreground text-xs">
            Define resource quotas and default properties for a new plan tier.
          </p>
        </div>
      </div>

      <div className="bg-card border-border/80 rounded-xl border p-6 shadow-sm">
        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive mb-4 flex items-center gap-2 rounded-lg border p-3 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-muted-foreground block text-[11px] font-medium uppercase">
              Plan Name (Slug)
            </label>
            <Input
              type="text"
              placeholder="e.g. enterprise, developer, team"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase())}
              required
              className="mt-1 font-mono text-xs"
            />
            <span className="text-muted-foreground text-[10px]">
              Must be lowercase letters, numbers, or hyphens (e.g. <code>pro-plus</code>)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-muted-foreground block text-[11px] font-medium uppercase">
                Max Reserved Subdomains
              </label>
              <Input
                type="number"
                min={1}
                value={maxReservedSubdomains}
                onChange={(e) => setMaxReservedSubdomains(parseInt(e.target.value) || 1)}
                required
                className="mt-1 font-mono text-xs"
              />
              <span className="text-muted-foreground text-[10px]">Subdomain alias cap</span>
            </div>
            <div>
              <label className="text-muted-foreground block text-[11px] font-medium uppercase">
                Max Active Tunnels
              </label>
              <Input
                type="number"
                min={1}
                value={maxActiveTunnels}
                onChange={(e) => setMaxActiveTunnels(parseInt(e.target.value) || 1)}
                required
                className="mt-1 font-mono text-xs"
              />
              <span className="text-muted-foreground text-[10px]">
                Concurrent live SSH sessions
              </span>
            </div>
          </div>

          <div className="border-border/60 flex items-center gap-2 border-t pt-4">
            <input
              type="checkbox"
              id="isDefaultPlan"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="accent-primary border-border rounded"
            />
            <label htmlFor="isDefaultPlan" className="text-muted-foreground cursor-pointer text-xs">
              Set as default plan assigned to newly registered users
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/admin/plans">
              <Button type="button" variant="outline" className="border-border text-xs">
                Cancel
              </Button>
            </Link>
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
      </div>
    </div>
  );
}
