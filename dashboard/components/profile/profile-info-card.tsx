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
    <div className="border-border/60 bg-card/90 flex flex-col overflow-hidden rounded-xl border shadow-xs">
      <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-5 py-3 text-xs">
        <div className="flex items-center gap-2 font-mono">
          <User className="text-primary h-3.5 w-3.5" />
          <span className="text-foreground text-xs font-semibold">Personal Profile Details</span>
        </div>
        <span className="text-muted-foreground font-mono text-[10px] font-semibold uppercase">
          IDENTITY
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 font-mono text-xs">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              DISPLAY NAME
            </label>
            <Input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50 border-border/60 focus-visible:ring-primary/40 h-9 rounded-lg font-mono text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              EMAIL ADDRESS
            </label>
            <Input
              type="email"
              value={profile?.email ?? ""}
              disabled
              className="bg-muted/30 border-border/60 text-muted-foreground h-9 rounded-lg font-mono text-xs"
            />
          </div>
        </div>

        <div className="grid gap-3 pt-1 text-xs sm:grid-cols-3">
          <div className="border-border/60 bg-muted/20 rounded-lg border p-3">
            <span className="text-muted-foreground block text-[10px] font-semibold uppercase">
              ACCOUNT ROLE
            </span>
            <span className="text-foreground mt-1 inline-flex items-center gap-1.5 font-bold">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
              {profile?.role?.toUpperCase() ?? "USER"}
            </span>
          </div>

          <div className="border-border/60 bg-muted/20 rounded-lg border p-3">
            <span className="text-muted-foreground block text-[10px] font-semibold uppercase">
              ACTIVE TIER PLAN
            </span>
            <span className="text-primary mt-1 block font-bold">
              {profile?.planName?.toUpperCase() ?? "DEFAULT"}
            </span>
          </div>

          <div className="border-border/60 bg-muted/20 rounded-lg border p-3">
            <span className="text-muted-foreground block text-[10px] font-semibold uppercase">
              MEMBER SINCE
            </span>
            <span className="text-foreground mt-1 inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 opacity-60" />
              {profile ? new Date(profile.createdAt).toLocaleDateString() : "-"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end pt-1">
          <Button
            type="submit"
            disabled={isPending || isUnchanged}
            size="sm"
            className="h-8 font-mono text-xs font-semibold"
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
