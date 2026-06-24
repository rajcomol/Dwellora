"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useI18n } from "@/i18n/provider";
import MarketingFeatureScreenshot from "@/components/marketing/MarketingFeatureScreenshot";
import {
  MARKETING_FEATURES,
  MARKETING_SECTION_IDS,
  type MarketingFeature,
} from "@/components/marketing/constants";
import { usePrefersReducedMotion } from "@/components/marketing/usePrefersReducedMotion";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  features?: readonly MarketingFeature[];
  showHeading?: boolean;
  sectionProps?: {
    id?: string;
    "data-testid"?: string;
  };
};

function FeatureBlocks({ features }: { features: readonly MarketingFeature[] }) {
  const { t } = useI18n();

  return (
    <>
      {features.map((feature) => (
        <article
          key={feature.id}
          data-feature-block
          data-reverse={feature.reverse ? "true" : "false"}
          data-testid={feature.testId}
          className="grid items-center gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12"
        >
          <div
            data-feature-text
            className={feature.reverse ? "order-2 lg:order-2" : "order-2 lg:order-1"}
          >
            <h3 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
              {t(`marketing.features.${feature.id}.title`)}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-renovation-concrete sm:text-lg">
              {t(`marketing.features.${feature.id}.body`)}
            </p>
          </div>

          <div className={feature.reverse ? "order-1 lg:order-1" : "order-1 lg:order-2"}>
            <MarketingFeatureScreenshot
              src={feature.image}
              alt={feature.imageAlt}
              testId={feature.testId}
            />
          </div>
        </article>
      ))}
    </>
  );
}

export default function MarketingFeatures({
  features = MARKETING_FEATURES,
  showHeading = true,
  sectionProps,
}: Props) {
  const { t } = useI18n();
  const reducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (reducedMotion || !sectionRef.current) return;

    const blocks = sectionRef.current.querySelectorAll<HTMLElement>("[data-feature-block]");
    const ctx = gsap.context(() => {
      blocks.forEach((block) => {
        const image = block.querySelector("[data-feature-image]");
        const text = block.querySelector("[data-feature-text]");
        const fromX = block.dataset.reverse === "true" ? 48 : -48;

        if (text) {
          gsap.from(text, {
            x: fromX * 0.4,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: { trigger: block, start: "top 80%" },
          });
        }

        if (image) {
          gsap.from(image, {
            x: fromX,
            opacity: 0,
            scale: 0.96,
            duration: 0.9,
            ease: "power2.out",
            scrollTrigger: { trigger: block, start: "top 80%" },
          });
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion, features]);

  return (
    <section
      ref={sectionRef}
      id={sectionProps?.id}
      data-testid={sectionProps?.["data-testid"]}
      className={[
        "bg-gradient-to-b from-background via-background to-renovation-surface/25",
        showHeading ? "py-20 sm:py-28" : "pb-20 sm:pb-28",
      ].join(" ")}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {showHeading ? (
          <h2 className="max-w-2xl text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            {t("marketing.features.heading")}
          </h2>
        ) : null}

        <div className={showHeading ? "mt-16 space-y-24 sm:space-y-28" : "space-y-24 sm:space-y-28"}>
          <FeatureBlocks features={features} />
        </div>
      </div>
    </section>
  );
}
