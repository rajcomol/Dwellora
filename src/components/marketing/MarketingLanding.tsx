"use client";

import MarketingAbout from "@/components/marketing/MarketingAbout";
import MarketingFeatures from "@/components/marketing/MarketingFeatures";
import MarketingFinalCta from "@/components/marketing/MarketingFinalCta";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import MarketingHero from "@/components/marketing/MarketingHero";
import MarketingHowItWorks from "@/components/marketing/MarketingHowItWorks";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingPricing from "@/components/marketing/MarketingPricing";
import MarketingProblem from "@/components/marketing/MarketingProblem";
import MarketingSfeerbeeldShowcase from "@/components/marketing/MarketingSfeerbeeldShowcase";
import MarketingStats from "@/components/marketing/MarketingStats";
import {
  MARKETING_FEATURES_AFTER_SHOWCASE,
  MARKETING_FEATURES_BEFORE_SHOWCASE,
  MARKETING_SECTION_IDS,
} from "@/components/marketing/constants";
import { useLenisSmoothScroll } from "@/components/marketing/useLenisSmoothScroll";

/** Client animatie-secties; teksten via i18n (nl.json → marketing.*). Lenis smooth scroll
 *  is hier (en alleen hier) actief, zodat het dashboard achter de login native blijft scrollen. */
export default function MarketingLanding() {
  useLenisSmoothScroll();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <MarketingNav />
      <main>
        <MarketingHero />
        <MarketingProblem />
        <MarketingStats />
        <MarketingFeatures
          features={MARKETING_FEATURES_BEFORE_SHOWCASE}
          sectionProps={{ id: MARKETING_SECTION_IDS.features, "data-testid": "marketing-features" }}
        />
        <MarketingSfeerbeeldShowcase />
        <MarketingFeatures features={MARKETING_FEATURES_AFTER_SHOWCASE} showHeading={false} />
        <MarketingHowItWorks />
        <MarketingPricing />
        <MarketingAbout />
        <MarketingFinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
