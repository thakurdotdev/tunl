import { useState } from "react";
import type { UserProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Check, Loader2, Save, ShieldCheck, User } from "lucide-react";

interface ProfileInfoCardProps {
  profile: UserProfile | undefined;
  onUpdateName: (name: string) => void;
  isPending: boolean;
}

export function ProfileInfoCard({ profile, onUpdateName, isPending }: ProfileInfoCardProps) {
  const [name, setName] = useState(profile?.name ?? "");
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateName(name);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-card border-border/80 rounded-xl border p-6 font-mono shadow-xs">
      <div className="border-border/60 flex items-center gap-3 border-b pb-4">
        <div className="bg-muted/40 border-border/80 flex h-10 w-10 items-center justify-center rounded-full border">
          <User className="text-muted-foreground h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold">Personal Profile Details</h2>
          <p className="text-muted-foreground text-xs">
            Manage your account identity, display name, and subscription tier.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-muted-foreground block text-[11px] font-medium uppercase">
              Display Name
            </label>
            <Input
              type="text"
              placeholder="e.g. Pankaj Thakur"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-muted-foreground block text-[11px] font-medium uppercase">
              Email Address
            </label>
            <Input
              type="email"
              value={profile?.email ?? ""}
              disabled
              className="bg-muted/30 border-border/60 text-muted-foreground mt-1.5 font-mono text-xs"
            />
          </div>
        </div>

        <div className="grid gap-4 pt-1 sm:grid-cols-3">
          <div className="bg-muted/20 border-border/60 rounded-lg border p-3.5">
            <span className="text-muted-foreground block text-[10px] font-medium uppercase">
              Account Role
            </span>
            <span className="text-foreground mt-1 inline-flex items-center gap-1.5 text-xs font-bold">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
              {profile?.role.toUpperCase()}
            </span>
          </div>

          <div className="bg-muted/20 border-border/60 rounded-lg border p-3.5">
            <span className="text-muted-foreground block text-[10px] font-medium uppercase">
              Active Tier Plan
            </span>
            <span className="text-primary mt-1 block text-xs font-bold">
              {profile?.planName.toUpperCase()}
            </span>
          </div>

          <div className="bg-muted/20 border-border/60 rounded-lg border p-3.5">
            <span className="text-muted-foreground block text-[10px] font-medium uppercase">
              Member Since
            </span>
            <span className="text-foreground mt-1 inline-flex items-center gap-1 text-xs">
              <Calendar className="h-3.5 w-3.5 opacity-60" />
              {profile ? new Date(profile.createdAt).toLocaleDateString() : "-"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button
            type="submit"
            disabled={isPending}
            size="sm"
            className="h-8 text-xs font-semibold"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
              </>
            ) : saved ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Profile Updated
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
