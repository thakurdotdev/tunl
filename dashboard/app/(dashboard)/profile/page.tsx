"use client";

import {
  useDisable2FA,
  useSetup2FA,
  useUpdateIpWhitelist,
  useUpdateProfileName,
  useVerify2FA,
} from "@/hooks/use-profile";
import { useAuth } from "@/lib/auth-context";
import { ProfileInfoCard } from "@/components/profile/profile-info-card";
import { TwoFactorCard } from "@/components/profile/two-factor-card";
import { IpWhitelistCard } from "@/components/profile/ip-whitelist-card";
import { AlertCircle, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user: profile, isLoading } = useAuth();

  const updateName = useUpdateProfileName();
  const setup2FA = useSetup2FA();
  const verify2FA = useVerify2FA();
  const disable2FA = useDisable2FA();
  const updateIpWhitelist = useUpdateIpWhitelist();

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center font-sans text-xs">
        <Loader2 className="text-primary mr-2 h-4 w-4 animate-spin" /> Loading profile details...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-4 font-sans">
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-6 text-xs">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="h-4 w-4" /> Unable to Load Profile
          </div>
          <p className="text-muted-foreground mt-1 font-sans">
            Please check your authentication session or reload.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* Header Bar */}
      <div className="border-border/60 flex flex-col gap-1 border-b pb-5">
        <h1 className="text-foreground text-xl font-bold tracking-tight">Account & Security</h1>
        <p className="text-muted-foreground text-xs">
          Manage profile details, 2FA authentication, and IP whitelisting rules.
        </p>
      </div>

      {/* Profile Info Card */}
      <ProfileInfoCard
        key={profile.name ?? "profile-name"}
        profile={profile}
        onUpdateName={(name) => updateName.mutate(name)}
        isPending={updateName.isPending}
      />

      {/* Two-Factor Authentication Card */}
      <TwoFactorCard
        profile={profile}
        onSetup2FA={() => setup2FA.mutateAsync()}
        onVerify2FA={(code) => verify2FA.mutateAsync(code)}
        onDisable2FA={() => disable2FA.mutateAsync()}
        isSetupPending={setup2FA.isPending}
        isVerifyPending={verify2FA.isPending}
        isDisablePending={disable2FA.isPending}
      />

      {/* IP Whitelist Security Card */}
      <IpWhitelistCard
        key={`${profile.ipWhitelistEnabled}-${profile.allowedIps?.join(",")}`}
        profile={profile}
        onUpdateWhitelist={(params) => updateIpWhitelist.mutateAsync(params)}
        isPending={updateIpWhitelist.isPending}
      />
    </div>
  );
}
