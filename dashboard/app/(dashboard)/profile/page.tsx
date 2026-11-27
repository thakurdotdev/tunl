"use client";

import { PageHeader } from "@/components/portal/page-header";
import { PasskeysCard } from "@/components/profile/passkeys-card";
import { ProfileInfoCard } from "@/components/profile/profile-info-card";
import { TwoFactorCard } from "@/components/profile/two-factor-card";
import {
  useDisable2FA,
  useSetup2FA,
  useUpdateProfileName,
  useVerify2FA,
} from "@/hooks/use-profile";
import { useAuth } from "@/lib/auth-context";
import { AlertCircle, ArrowRight, Loader2, Network } from "lucide-react";
import Link from "next/link";

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 className="text-foreground text-sm font-semibold">{title}</h2>
      <p className="text-muted-foreground text-xs">{description}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { user: profile, isLoading } = useAuth();

  const updateName = useUpdateProfileName();
  const setup2FA = useSetup2FA();
  const verify2FA = useVerify2FA();
  const disable2FA = useDisable2FA();

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-xs">
        <Loader2 className="text-primary mr-2 h-4 w-4 animate-spin" /> Loading account…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-6 text-xs">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <AlertCircle className="h-4 w-4" /> Unable to load your account
        </div>
        <p className="text-muted-foreground mt-1">Check your session or reload the page.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Account settings"
        description="Your profile and how you sign in to tunl."
      />

      <section className="flex flex-col gap-3">
        <SectionHeading title="Profile" description="How you appear across tunl." />
        <ProfileInfoCard
          key={profile.name ?? "profile-name"}
          profile={profile}
          onUpdateName={(name) => updateName.mutate(name)}
          isPending={updateName.isPending}
        />
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading
          title="Sign-in security"
          description="Extra checks when you log in to this dashboard."
        />
        <TwoFactorCard
          profile={profile}
          onSetup2FA={() => setup2FA.mutateAsync()}
          onVerify2FA={(code) => verify2FA.mutateAsync(code)}
          onDisable2FA={() => disable2FA.mutateAsync()}
          isSetupPending={setup2FA.isPending}
          isVerifyPending={verify2FA.isPending}
          isDisablePending={disable2FA.isPending}
        />
        <PasskeysCard />
      </section>

      <Link
        href="/access"
        className="group surface-card bg-card flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors hover:border-[var(--hairline-strong)]"
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">Looking for the IP allowlist?</p>
            <p className="text-muted-foreground text-xs">
              It moved to Access control, next to tunnel passwords.
            </p>
          </div>
        </div>
        <ArrowRight className="text-muted-foreground group-hover:text-foreground h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
