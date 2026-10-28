import type { Metadata } from "next";
import { Comparison } from "@/components/landing/comparison";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingShell } from "@/components/landing/landing-shell";
import { Pricing } from "@/components/landing/pricing";
import { UseCases } from "@/components/landing/use-cases";
import { WhySsh } from "@/components/landing/why-ssh";
import { SEO_DESCRIPTION, SEO_KEYWORDS, SEO_TITLE, SITE_URL } from "@/lib/seo";
import "./landing.css";

export const metadata: Metadata = {
  title: {
    absolute: SEO_TITLE,
  },
  description: SEO_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "tunl — Make localhost public with one SSH command",
    description: SEO_DESCRIPTION,
    url: SITE_URL,
    type: "website",
  },
  twitter: {
    title: "tunl — Make localhost public with one SSH command",
    description:
      "Zero-install OpenSSH reverse tunnel. Expose localhost, APIs, WebSockets, and webhooks with one ssh command.",
  },
};

export default function LandingPage() {
  return (
    <LandingShell>
      <LandingNav />
      <main id="top">
        <Hero />
        <HowItWorks />
        <WhySsh />
        <UseCases />
        <Features />
        <Comparison />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <LandingFooter />
    </LandingShell>
  );
}
