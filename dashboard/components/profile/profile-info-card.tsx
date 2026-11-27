import { useState } from "react";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2 } from "lucide-react";

interface ProfileInfoCardProps {
  profile: User | undefined;
  onUpdateName: (name: string) => void;
  isPending: boolean;
}

const getInitial = (name?: string | null, email?: string | null) => {
  if (name && name.trim()) {
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return trimmed[0].toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim()[0].toUpperCase();
  }
  return "U";
};

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
  const userInitial = getInitial(profile?.name, profile?.email);

  const since = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="surface-card bg-card flex flex-col gap-5 rounded-xl border p-5 font-sans"
    >
      <div className="flex items-center gap-4">
        {profile?.image ? (
          <img
            src={profile.image}
            alt=""
            className="h-12 w-12 shrink-0 rounded-full border border-[var(--hairline)] object-cover"
          />
        ) : (
          <div className="bg-secondary text-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--hairline)] text-sm font-bold">
            {userInitial}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-foreground truncate text-sm font-semibold">{profile?.email}</p>
          <p className="text-muted-foreground mt-0.5 text-xs capitalize">
            {profile?.plan?.name ?? "Free"} plan
            {profile?.role === "admin" ? " · admin" : ""}
            {since ? ` · since ${since}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="display-name" className="text-foreground text-xs font-medium">
          Display name
        </label>
        <div className="flex gap-2">
          <Input
            id="display-name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 max-w-sm min-w-0 flex-1 text-sm"
          />
          <Button type="submit" disabled={isPending || isUnchanged} className="h-9">
            {isPending ? (
              <Loader2 className="animate-spin" />
            ) : saved ? (
              <Check className="text-emerald-400" />
            ) : null}
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}
