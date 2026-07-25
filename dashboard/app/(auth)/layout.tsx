import { Logo } from "@/components/logo";
import { GuestGuard } from "@/components/guest-guard";
import { ModeToggle } from "@/components/mode-toggle";
import { TerminalDemo } from "@/components/terminal-demo";
import Link from "next/link";
import "./auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestGuard>
      <div className="auth-layout">
        <div className="auth-form-panel">
          <div className="auth-form-container">
            <div className="auth-logo flex items-center justify-between">
              <Link href="/" className="transition-opacity hover:opacity-80" title="Return to home">
                <Logo />
              </Link>
              <ModeToggle />
            </div>
            {children}
          </div>
        </div>
        <div className="auth-brand-panel">
          <div className="auth-brand-content">
            <TerminalDemo />
            <div className="auth-brand-text font-sans">
              <h2 className="text-foreground text-[1.375rem] font-bold tracking-tight">
                Instant SSH Tunnels to Localhost
              </h2>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Zero binaries to install. Expose local web applications to the internet instantly
                using standard OpenSSH built into your terminal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </GuestGuard>
  );
}
