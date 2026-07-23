import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, X } from "lucide-react";

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    maxReservedSubdomains: number;
    maxActiveTunnels: number;
    isDefault?: boolean;
  }) => void;
  isPending: boolean;
  error?: string;
}

export function CreatePlanModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  error,
}: CreatePlanModalProps) {
  const [name, setName] = useState("");
  const [maxReservedSubdomains, setMaxReservedSubdomains] = useState(1);
  const [maxActiveTunnels, setMaxActiveTunnels] = useState(1);
  const [isDefault, setIsDefault] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim().toLowerCase(),
      maxReservedSubdomains,
      maxActiveTunnels,
      isDefault,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 font-mono backdrop-blur-xs">
      <div className="bg-card border-border w-full max-w-md rounded-xl border p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Create New Plan Tier</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Define a new subscription tier with specific tunnel and subdomain quotas.
        </p>

        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive mt-4 flex items-center gap-2 rounded-lg border p-3 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-muted-foreground block text-[11px] font-medium uppercase">
              Plan Name (Slug)
            </label>
            <Input
              type="text"
              placeholder="e.g. enterprise"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase())}
              required
              className="mt-1 font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground block text-[11px] font-medium uppercase">
                Max Subdomains
              </label>
              <Input
                type="number"
                min={1}
                value={maxReservedSubdomains}
                onChange={(e) => setMaxReservedSubdomains(parseInt(e.target.value) || 1)}
                required
                className="mt-1 font-mono text-xs"
              />
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
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="accent-primary border-border rounded"
            />
            <label htmlFor="isDefault" className="text-muted-foreground cursor-pointer text-xs">
              Set as default plan for new users
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="text-xs">
              {isPending ? "Creating..." : "Create Plan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
