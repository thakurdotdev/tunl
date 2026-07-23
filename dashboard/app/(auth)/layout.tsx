import { Logo } from "@/components/logo";
import { GuestGuard } from "@/components/guest-guard";
import { ModeToggle } from "@/components/mode-toggle";
import { TerminalDemo } from "@/components/terminal-demo";
import "./auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestGuard>
      <div className="auth-layout">
        <div className="auth-form-panel">
          <div className="auth-form-container">
            <div className="auth-logo flex items-center justify-between">
              <Logo />
              <ModeToggle />
            </div>
            {children}
          </div>
        </div>
        <div className="auth-brand-panel">
          <div className="auth-brand-content">
            <TerminalDemo />
            <div className="auth-brand-text">
              <div className="flex items-center gap-2">
                <span className="text-primary text-lg font-bold">{">"}</span>
                <h2>Instant SSH Tunnels to Localhost</h2>
              </div>
              <p>
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
