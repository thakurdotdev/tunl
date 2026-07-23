import type { AdminPlan, AdminUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X } from "lucide-react";

interface AssignPlanModalProps {
  user: AdminUser | null;
  plans: AdminPlan[] | undefined;
  onClose: () => void;
  onSelectPlan: (planName: string) => void;
  isPending: boolean;
}

export function AssignPlanModal({
  user,
  plans,
  onClose,
  onSelectPlan,
  isPending,
}: AssignPlanModalProps) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 font-mono backdrop-blur-xs">
      <div className="bg-card border-border w-full max-w-md rounded-xl border p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Assign Plan to User</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Target User: <strong className="text-foreground">{user.email}</strong>
        </p>

        <div className="mt-5 space-y-3">
          {plans?.map((plan) => {
            const isCurrent = user.planName === plan.name;
            return (
              <div
                key={plan.id}
                onClick={() => !isPending && onSelectPlan(plan.name)}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all ${
                  isCurrent
                    ? "border-primary bg-primary/10"
                    : "border-border/70 hover:border-primary/50 hover:bg-muted/40"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-bold uppercase">{plan.name}</span>
                    {isCurrent && (
                      <span className="text-primary flex items-center text-[10px] font-bold">
                        <CheckCircle2 className="mr-0.5 h-3 w-3" /> ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    Max Reserved: <strong>{plan.maxReservedSubdomains}</strong> | Max Active
                    Tunnels: <strong>{plan.maxActiveTunnels}</strong>
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isCurrent ? "default" : "outline"}
                  disabled={isPending}
                  className="h-7 text-xs"
                >
                  {isCurrent ? "Current" : "Assign"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
