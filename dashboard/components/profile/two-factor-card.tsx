import { useState } from "react";
import type { Setup2FAResponse, UserProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { AlertCircle, CheckCircle2, Copy, Loader2, X } from "lucide-react";

interface TwoFactorCardProps {
  profile: UserProfile | undefined;
  onSetup2FA: () => Promise<Setup2FAResponse>;
  onVerify2FA: (code: string) => Promise<any>;
  onDisable2FA: () => Promise<any>;
  isSetupPending: boolean;
  isVerifyPending: boolean;
  isDisablePending: boolean;
}

export function TwoFactorCard({
  profile,
  onSetup2FA,
  onVerify2FA,
  onDisable2FA,
  isSetupPending,
  isVerifyPending,
  isDisablePending,
}: TwoFactorCardProps) {
  const [setupData, setSetupData] = useState<Setup2FAResponse | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);

  const handleStartSetup = async () => {
    setError("");
    try {
      const res = await onSetup2FA();
      setSetupData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to initiate 2FA setup");
    }
  };

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await onVerify2FA(code);
      setSetupData(null);
      setCode("");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Invalid 2FA code");
    }
  };

  const handleConfirmDisable = async () => {
    setError("");
    try {
      await onDisable2FA();
      setIsDisableModalOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to disable 2FA");
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="surface-card bg-card flex flex-col overflow-hidden rounded-xl border font-sans">
        <div className="flex items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-foreground text-sm font-semibold">Two-factor authentication</h3>
              {profile?.twoFactorEnabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> On
                </span>
              ) : (
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
                  Off
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              A code from your authenticator app at sign-in.
            </p>
          </div>

          <div className="shrink-0">
            {profile?.twoFactorEnabled ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDisableModalOpen(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Turn off
              </Button>
            ) : (
              <Button size="sm" onClick={handleStartSetup} disabled={isSetupPending}>
                {isSetupPending ? (
                  <>
                    <Loader2 className="animate-spin" /> Setting up…
                  </>
                ) : (
                  "Turn on"
                )}
              </Button>
            )}
          </div>
        </div>

        {/* 2FA Setup Modal */}
        {setupData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-sans backdrop-blur-xs">
            <div className="bg-card surface-card w-full max-w-md rounded-xl border p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Setup Two-Factor Authentication</h3>
                <button
                  onClick={() => setSetupData(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {error && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive mt-3 flex items-center gap-2 rounded-md border p-2.5 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="border-border/60 mt-4 flex flex-col items-center justify-center rounded-md border bg-white p-3">
                <img
                  src={setupData.qrCodeDataUrl}
                  alt="2FA QR Code"
                  className="h-44 w-44 object-contain"
                />
              </div>

              <div className="border-border/60 bg-muted/40 mt-3 flex items-center justify-between rounded-md border p-2.5 text-xs">
                <div className="overflow-hidden pr-2">
                  <span className="text-muted-foreground block text-[10px] uppercase">
                    Secret Key
                  </span>
                  <code className="text-foreground block truncate font-mono text-xs font-semibold">
                    {setupData.secret}
                  </code>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copySecret}
                  className="h-7 shrink-0 text-xs"
                >
                  <Copy className="mr-1 h-3 w-3" /> {copied ? "Copied" : "Copy"}
                </Button>
              </div>

              <form onSubmit={handleVerifySetup} className="mt-4 space-y-3">
                <div>
                  <label className="text-foreground block text-xs font-medium">
                    Enter 6-Digit Code
                  </label>
                  <Input
                    name="totpCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    required
                    className="border-border/60 bg-background mt-1 h-9 rounded-md text-center font-mono text-sm font-semibold tracking-widest"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSetupData(null)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isVerifyPending || code.length !== 6}
                    className="text-xs font-semibold"
                  >
                    {isVerifyPending ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Verifying...
                      </>
                    ) : (
                      "Verify & Enable"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Disable 2FA Modal */}
      <ConfirmationModal
        isOpen={isDisableModalOpen}
        onClose={() => {
          setIsDisableModalOpen(false);
          setError("");
        }}
        onConfirm={handleConfirmDisable}
        title="Disable Two-Factor Authentication"
        description="Are you sure you want to disable Two-Factor Authentication?"
        confirmText="Disable 2FA"
        variant="destructive"
        isPending={isDisablePending}
      />
    </>
  );
}
