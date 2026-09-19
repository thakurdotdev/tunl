import { Comparison } from "@/components/landing/comparison";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { Pricing } from "@/components/landing/pricing";
import { UseCases } from "@/components/landing/use-cases";
import { WhySsh } from "@/components/landing/why-ssh";

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col font-sans">
      <LandingNav />
      <main className="flex-1" id="content">
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
    </div>
  );
}
