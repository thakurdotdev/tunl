import { Logo } from "@/components/logo";
import { GuestGuard } from "@/components/guest-guard";
import { HeroFlow } from "@/components/hero-flow";
import { ModeToggle } from "@/components/mode-toggle";
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
            {/* Same Animated Hero Flow as Landing Page */}
            <div className="w-full">
              <HeroFlow />
            </div>

            <div className="auth-brand-text font-sans">
              <h2 className="text-foreground text-[1.375rem] font-bold tracking-tight">
                One command. Public URL.
              </h2>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Log in to reserve persistent static subdomains bound directly to your OpenSSH public
                key. No CLI installation or client daemons required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </GuestGuard>
  );
}
