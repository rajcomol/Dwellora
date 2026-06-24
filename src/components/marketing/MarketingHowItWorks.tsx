"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Card from "@/components/ui/Card";
import { useI18n } from "@/i18n/provider";
import { usePrefersReducedMotion } from "@/components/marketing/usePrefersReducedMotion";

gsap.registerPlugin(ScrollTrigger);

const STEP_KEYS = ["1", "2", "3"] as const;

export default function MarketingHowItWorks() {
  const { t } = useI18n();
  const reducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion || !sectionRef.current || !cardsRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from(cardsRef.current!.children, {
        y: 32,
        opacity: 0,
        duration: 0.75,
        stagger: 0.14,
        ease: "power2.out",
        scrollTrigger: {
          trigger: cardsRef.current,
          start: "top 85%",
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} data-testid="marketing-how-it-works" className="bg-gradient-to-b from-renovation-surface/25 via-renovation-surface to-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="max-w-3xl text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          {t("marketing.howItWorks.heading")}
        </h2>
        <div ref={cardsRef} className="mt-12 grid gap-5 md:grid-cols-3">
          {STEP_KEYS.map((step) => (
            <Card
              key={step}
              data-testid={`marketing-step-${step}`}
              className="transition-all duration-300 hover:-translate-y-1 hover:shadow-renovation-card"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-renovation-accent/15 text-sm font-semibold text-renovation-accent">
                {step}
              </span>
              <h3 className="mt-4 text-lg font-medium text-foreground">
                {t(`marketing.howItWorks.steps.${step}.title`)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-renovation-concrete">
                {t(`marketing.howItWorks.steps.${step}.body`)}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
