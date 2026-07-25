import { Logo } from "@/components/logo";
import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-border/60 border-t py-10 text-xs">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-5 sm:px-6">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
          {/* Left branding */}
          <div className="flex flex-col gap-2.5">
            <Logo />
            <p className="text-muted-foreground max-w-xs text-xs leading-relaxed">
              Expose localhost web servers to the internet via standard OpenSSH. No CLI download
              required.
            </p>
          </div>

          {/* Right link columns */}
          <div className="flex flex-wrap gap-x-12 gap-y-6 text-xs">
            <div className="flex flex-col gap-2.5">
              <span className="text-foreground text-[11px] font-semibold tracking-wider uppercase">
                Product
              </span>
              <nav className="text-muted-foreground flex flex-col gap-2 font-medium">
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Dashboard
                </Link>
                <Link href="/keys" className="hover:text-foreground transition-colors">
                  SSH Keys
                </Link>
                <Link href="/inspect" className="hover:text-foreground transition-colors">
                  Inspect Tunnels
                </Link>
              </nav>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-foreground text-[11px] font-semibold tracking-wider uppercase">
                Developer
              </span>
              <nav className="text-muted-foreground flex flex-col gap-2 font-medium">
                <a
                  href="https://thakur.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Pankaj Thakur
                </a>
                <a
                  href="https://github.com/thakurdotdev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  GitHub (@thakurdotdev)
                </a>
                <a
                  href="https://x.com/thakurdotdev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  X (@thakurdotdev)
                </a>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-border/40 text-muted-foreground flex flex-col items-center justify-between gap-3 border-t pt-6 text-[12px] sm:flex-row">
          <span>© {new Date().getFullYear()} tunl. All rights reserved.</span>
          <span>
            Designed & built by{" "}
            <a
              href="https://thakur.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary font-medium transition-colors"
            >
              Pankaj Thakur
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
