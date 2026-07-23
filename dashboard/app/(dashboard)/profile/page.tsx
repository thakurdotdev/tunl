"use client";

import {
  useDisable2FA,
  useProfile,
  useSetup2FA,
  useUpdateIpWhitelist,
  useUpdateProfileName,
  useVerify2FA,
} from "@/hooks/use-profile";
import { ProfileInfoCard } from "@/components/profile/profile-info-card";
import { TwoFactorCard } from "@/components/profile/two-factor-card";
import { IpWhitelistCard } from "@/components/profile/ip-whitelist-card";

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile();

  const updateName = useUpdateProfileName();
  const setup2FA = useSetup2FA();
  const verify2FA = useVerify2FA();
  const disable2FA = useDisable2FA();
  const updateIpWhitelist = useUpdateIpWhitelist();

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center font-mono text-xs">
        Loading profile details...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12 font-mono">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Account & Security Center</h1>
        <p className="text-muted-foreground text-xs">
          Manage your account profile, configure 2FA authentication, and set IP whitelisting rules.
        </p>
      </div>

      {/* User Information Card */}
      <ProfileInfoCard
        profile={profile}
        onUpdateName={(name) => updateName.mutate(name)}
        isPending={updateName.isPending}
      />

      {/* Two-Factor Authentication Card */}
      <TwoFactorCard
        profile={profile}
        onSetup2FA={() => setup2FA.mutateAsync()}
        onVerify2FA={(code) => verify2FA.mutateAsync(code)}
        onDisable2FA={(code) => disable2FA.mutateAsync(code)}
        isSetupPending={setup2FA.isPending}
        isVerifyPending={verify2FA.isPending}
        isDisablePending={disable2FA.isPending}
      />

      {/* IP Whitelist Security Card */}
      <IpWhitelistCard
        profile={profile}
        onUpdateWhitelist={(params) => updateIpWhitelist.mutateAsync(params)}
        isPending={updateIpWhitelist.isPending}
      />
    </div>
  );
}
