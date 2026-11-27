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
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function SectionHeading({ title }: { title: string }) {
  return <h2 className="text-muted-foreground text-xs font-semibold">{title}</h2>;
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
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Your profile and sign-in options." />

      <section className="flex flex-col gap-2">
        <SectionHeading title="Profile" />
        <ProfileInfoCard
          key={profile.name ?? "profile-name"}
          profile={profile}
          onUpdateName={(name) => updateName.mutate(name)}
          isPending={updateName.isPending}
        />
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeading title="Sign-in security" />
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

      <p className="text-muted-foreground text-xs">
        IP allowlist and tunnel passwords are in{" "}
        <Link href="/access" className="text-primary font-medium hover:underline">
          Access control
        </Link>
        .
      </p>
    </div>
  );
}
