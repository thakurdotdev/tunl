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

  const isUnchanged = name.trim() === (profile?.name ?? "");

  return (
    <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-lg border font-sans shadow-2xs">
      <div className="border-border/60 bg-muted/40 flex items-center justify-between border-b px-4 py-2.5 font-sans text-xs">
        <div className="text-foreground flex items-center gap-2 font-medium">
          <User className="text-primary h-4 w-4" />
          <span className="text-xs font-semibold">Personal Profile Details</span>
        </div>
        <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          Identity
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-5 text-xs">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-xs font-medium">Display Name</label>
            <Input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-border/60 bg-background h-9 rounded-md font-sans text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-foreground text-xs font-medium">Email Address</label>
            <Input
              type="email"
              value={profile?.email ?? ""}
              disabled
              className="border-border/60 bg-muted/40 text-muted-foreground h-9 rounded-md font-sans text-xs"
            />
          </div>
        </div>

        <div className="grid gap-3 pt-1 text-xs sm:grid-cols-3">
          <div className="border-border/60 bg-muted/20 rounded-md border p-3">
            <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
              Account Role
            </span>
            <span className="text-foreground mt-1 inline-flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              {profile?.role?.toUpperCase() ?? "USER"}
            </span>
          </div>

          <div className="border-border/60 bg-muted/20 rounded-md border p-3">
            <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
              Active Tier Plan
            </span>
            <span className="mt-1 block font-semibold text-emerald-400">
              {profile?.planName?.toUpperCase() ?? "DEFAULT"}
            </span>
          </div>

          <div className="border-border/60 bg-muted/20 rounded-md border p-3">
            <span className="text-muted-foreground block text-[11px] font-medium tracking-wider uppercase">
              Member Since
            </span>
            <span className="text-foreground mt-1 inline-flex items-center gap-1.5 font-medium">
              <Calendar className="text-muted-foreground h-3.5 w-3.5" />
              {profile ? new Date(profile.createdAt).toLocaleDateString() : "-"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end pt-1">
          <Button
            type="submit"
            disabled={isPending || isUnchanged}
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
