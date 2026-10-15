"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Laptop,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

interface CustomDomainIntroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGetStarted?: () => void;
}

export function CustomDomainIntroDialog({
  open,
  onOpenChange,
  onGetStarted,
}: CustomDomainIntroDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(true);

  const handleClose = (shouldGetStarted = false) => {
    if (dontShowAgain && typeof window !== "undefined") {
      try {
        localStorage.setItem("tunl_custom_domain_intro_seen", "true");
      } catch {}
    }
    onOpenChange(false);
    if (shouldGetStarted && onGetStarted) {
      onGetStarted();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full sm:max-w-lg md:max-w-xl gap-0 overflow-hidden p-0 font-sans border-border/70 shadow-2xl rounded-2xl"
        showCloseButton
      >
        {/* Header */}
        <div className="border-b border-border/60 bg-muted/20 px-6 py-5 sm:px-7">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              <Sparkles className="h-3 w-3" />
              New Feature
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              Automatic TLS
            </span>
          </div>

          <DialogHeader className="gap-1 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  Custom Domains
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                  Route traffic from your own branded domain directly to any active tunnel.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 space-y-5 text-xs sm:text-sm">
          {/* Visual Routing Flow */}
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="text-[11px] font-medium text-muted-foreground mb-3 flex items-center justify-between">
              <span>Traffic Routing</span>
              <span className="text-[10px] text-emerald-400 font-mono">● Zero downtime</span>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 font-mono text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-foreground font-semibold truncate">api.yourdomain.com</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0">
                <Laptop className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-foreground font-semibold truncate">localhost:3000</span>
              </div>
            </div>
          </div>

          {/* 3 Step List */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Setup
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/10 p-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary mt-0.5">
                  1
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Attach Your Domain</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Enter your hostname and select which tunnel receives the traffic.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/10 p-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary mt-0.5">
                  2
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Add DNS Records</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Add a <code className="font-mono text-foreground/90">CNAME</code> pointing to <code className="font-mono text-primary">cname.tunl.online</code> and a <code className="font-mono text-foreground/90">TXT</code> verification record.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/10 p-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary mt-0.5">
                  3
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Verify & Go Live</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Click &ldquo;Verify DNS&rdquo; and your custom domain immediately routes with free automatic TLS.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cloudflare tip */}
          <div className="flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-300">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-sky-400" />
            <span>Works seamlessly with Cloudflare proxy (orange cloud) for free DDoS protection.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 bg-muted/20 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary/40 h-3.5 w-3.5"
            />
            <span>Don&apos;t show again</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleClose(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </Button>
            <Button
              size="sm"
              onClick={() => handleClose(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
