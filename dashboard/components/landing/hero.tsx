"use client";

import { HeroFlow } from "@/components/hero-flow";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative pt-10 pb-14 md:pt-16 md:pb-18">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          {/* Descriptor */}
          <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
            Free OpenSSH Reverse Tunnels · No Client Required
          </p>

          {/* Headline */}
          <h1 className="text-foreground mb-6 text-3xl leading-[1.08] font-bold tracking-tight sm:text-5xl md:text-6xl">
            One command. <br className="hidden sm:block" />
            Public URL.
          </h1>

          {/* Reusable Animated Hero Flow & Command Box */}
          <div className="mb-4 w-full max-w-2xl">
            <HeroFlow />
          </div>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard">
                <Button size="lg" className="gap-2 px-5 text-xs font-semibold">
                  Start Tunnel <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="px-5 text-xs">
                  Add SSH Key
                </Button>
              </Link>
            </div>
            <p className="text-muted-foreground/60 text-xs font-medium">
              Free to use · No credit card or account required for basic tunnels
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
