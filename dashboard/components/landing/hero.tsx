"use client";

import { HeroFlow } from "@/components/hero-flow";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative pt-12 pb-16 md:pt-20 md:pb-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          {/* Descriptor */}
          <p className="text-muted-foreground mb-4 font-mono text-[11px] font-medium tracking-wider uppercase sm:text-xs">
            Free OpenSSH Reverse Tunnels · tunl.online
          </p>

          {/* Headline */}
          <h1 className="text-foreground mb-10 text-4xl leading-[1.06] font-bold tracking-tight sm:text-6xl md:text-7xl">
            One command. <br className="hidden sm:block" />
            Public URL.
          </h1>

          {/* Reusable Animated Hero Flow & Command Box */}
          <div className="mb-8 w-full max-w-2xl">
            <HeroFlow />
          </div>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard" aria-label="Start free SSH tunnel with tunl">
                <Button size="lg" className="gap-2 px-5 text-xs font-semibold">
                  Start Tunnel <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href="/login" aria-label="Register your SSH public key on tunl.online">
                <Button variant="outline" size="lg" className="px-5 text-xs">
                  Add SSH Key
                </Button>
              </Link>
            </div>
            <p className="text-muted-foreground text-xs font-medium">
              Free to use · No credit card or account required for basic tunnels
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
