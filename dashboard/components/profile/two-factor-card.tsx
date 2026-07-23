import { useState } from "react";
import type { Setup2FAResponse, UserProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { AlertCircle, CheckCircle2, Copy, KeyRound, Loader2, X } from "lucide-react";

interface TwoFactorCardProps {
  profile: UserProfile | undefined;
  onSetup2FA: () => Promise<Setup2FAResponse>;
  onVerify2FA: (code: string) => Promise<any>;
  onDisable2FA: (code: string) => Promise<any>;
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
  const [disableCode, setDisableCode] = useState("");

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
      await onDisable2FA(disableCode);
      setIsDisableModalOpen(false);
      setDisableCode("");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Invalid 2FA code");
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
      <div className="bg-card border-border/80 rounded-xl border p-6 font-mono shadow-xs">
        <div className="border-border/60 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/10">
              <KeyRound className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Two-Factor Authentication (2FA)</h2>
                {profile?.twoFactorEnabled ? (
                  <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> ENABLED
                  </span>
                ) : (
                  <span className="border-border bg-muted/40 text-muted-foreground rounded-full border px-2.5 py-0.5 text-[10px]">
                    DISABLED
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Protect your account using TOTP authenticator apps (Google Authenticator,
                1Password).
              </p>
            </div>
          </div>

          <div>
            {profile?.twoFactorEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDisableModalOpen(true)}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 h-8 text-xs font-semibold"
              >
                Disable 2FA
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleStartSetup}
                disabled={isSetupPending}
                className="h-8 text-xs font-semibold"
              >
                {isSetupPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Generating...
                  </>
                ) : (
                  "Enable 2FA"
                )}
              </Button>
            )}
          </div>
        </div>

        {/* 2FA Setup Modal */}
        {setupData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="bg-card border-border w-full max-w-md rounded-xl border p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold">Setup Two-Factor Authentication</h3>
                <button
                  onClick={() => setSetupData(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-muted-foreground mt-1 text-xs">
                Scan the QR code with your authenticator app, or manually enter the secret key.
              </p>

              {error && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive mt-3 flex items-center gap-2 rounded-lg border p-2.5 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="border-border/80 mt-4 flex flex-col items-center justify-center rounded-lg border bg-white p-3">
                <img
                  src={setupData.qrCodeDataUrl}
                  alt="2FA QR Code"
                  className="h-44 w-44 object-contain"
                />
              </div>

              <div className="border-border/60 bg-muted/40 mt-3 flex items-center justify-between rounded-lg border p-2.5 text-xs">
                <div className="overflow-hidden pr-2">
                  <span className="text-muted-foreground block text-[10px] uppercase">
                    Secret Key
                  </span>
                  <code className="text-foreground block truncate font-bold">
                    {setupData.secret}
                  </code>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copySecret}
                  className="border-border h-7 shrink-0 text-[11px]"
                >
                  <Copy className="mr-1 h-3 w-3" /> {copied ? "Copied" : "Copy"}
                </Button>
              </div>

              <form onSubmit={handleVerifySetup} className="mt-4 space-y-3">
                <div>
                  <label className="text-muted-foreground block text-[11px] font-medium uppercase">
                    Enter 6-Digit Code from Authenticator
                  </label>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    required
                    className="mt-1 text-center font-mono text-sm font-bold tracking-widest"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSetupData(null)}
                    className="border-border text-xs"
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
          setDisableCode("");
          setError("");
        }}
        onConfirm={handleConfirmDisable}
        title="Disable Two-Factor Authentication"
        description="To confirm disabling 2FA, please enter your current 6-digit authenticator code below."
        confirmText="Disable 2FA"
        variant="destructive"
        isPending={isDisablePending}
      />
    </>
  );
}
