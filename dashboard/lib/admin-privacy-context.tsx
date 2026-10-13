"use client";

import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

interface AdminPrivacyContextType {
  isMasked: boolean;
  toggleMask: () => void;
  maskEmail: (email?: string | null) => string;
  maskIp: (ip?: string | null) => string;
  maskName: (name?: string | null) => string;
  maskId: (id?: string | null) => string;
}

const STORAGE_KEY = "tunl_admin_mask_pii";

const AdminPrivacyContext = createContext<AdminPrivacyContextType>({
  isMasked: false,
  toggleMask: () => {},
  maskEmail: (e) => e ?? "—",
  maskIp: (ip) => ip ?? "—",
  maskName: (n) => n ?? "—",
  maskId: (id) => id ?? "—",
});

export function AdminPrivacyProvider({ children }: { children: ReactNode }) {
  const [isMasked, setIsMasked] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsMasked(stored === "true");
      }
    } catch {
      // Ignore localStorage access issues
    }
  }, []);

  const toggleMask = () => {
    setIsMasked((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore localStorage errors
      }
      if (next) {
        toast.success("Privacy Mode Active — Emails, IPs, and identifiers are masked for privacy.");
      } else {
        toast.info("Privacy Mode Disabled — Full personal details visible.");
      }
      return next;
    });
  };

  const maskEmail = (email?: string | null): string => {
    if (!email) return "—";
    if (!isMasked) return email;
    const parts = email.split("@");
    if (parts.length !== 2) return "••••••••";
    const [user, domain] = parts;
    const maskedUser =
      user.length <= 2
        ? `${user[0]}*`
        : `${user.slice(0, 2)}${"*".repeat(Math.min(4, Math.max(2, user.length - 3)))}${user.slice(-1)}`;

    const domainParts = domain.split(".");
    if (domainParts.length <= 1) {
      return `${maskedUser}@${domain[0]}***`;
    }
    const tld = domainParts.pop();
    const domainName = domainParts.join(".");
    const maskedDomain =
      domainName.length <= 2 ? `${domainName[0]}*` : `${domainName.slice(0, 2)}***`;

    return `${maskedUser}@${maskedDomain}.${tld}`;
  };

  const maskIp = (ip?: string | null): string => {
    if (!ip) return "—";
    if (!isMasked) return ip;
    // IPv4 address
    if (ip.includes(".")) {
      const segments = ip.split(".");
      if (segments.length === 4) {
        return `${segments[0]}.${segments[1]}.***.***`;
      }
    }
    // IPv6 address
    if (ip.includes(":")) {
      const segments = ip.split(":");
      return `${segments.slice(0, 2).join(":")}:****:****`;
    }
    return "•••.•••.•••";
  };

  const maskName = (name?: string | null): string => {
    if (!name) return "—";
    if (!isMasked) return name;
    return name
      .trim()
      .split(/\s+/)
      .map((word) => (word.length <= 1 ? `${word}*` : `${word[0]}***`))
      .join(" ");
  };

  const maskId = (id?: string | null): string => {
    if (!id) return "—";
    if (!isMasked) return id;
    if (id.length <= 8) return "••••••••";
    return `${id.slice(0, 4)}••••${id.slice(-4)}`;
  };

  const value = useMemo(
    () => ({
      isMasked,
      toggleMask,
      maskEmail,
      maskIp,
      maskName,
      maskId,
    }),
    [isMasked],
  );

  return <AdminPrivacyContext.Provider value={value}>{children}</AdminPrivacyContext.Provider>;
}

export function useAdminPrivacy() {
  return useContext(AdminPrivacyContext);
}

export function AdminPrivacyToggle({ className }: { className?: string }) {
  const { isMasked, toggleMask } = useAdminPrivacy();

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      onClick={toggleMask}
      className={`h-8 w-8 transition-all ${
        isMasked
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
          : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
      } ${className ?? ""}`}
      title={
        isMasked
          ? "Privacy Mode ON: Personal emails, IPs, and identifiers are masked"
          : "Privacy Mode OFF: Click to mask sensitive personal details for screen sharing"
      }
      aria-label="Toggle PII Privacy Masking"
    >
      {isMasked ? (
        <EyeOff className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Eye className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
