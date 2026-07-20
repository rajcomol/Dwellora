"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Card from "@/components/ui/Card";
import { useI18n } from "@/i18n/provider";
import { usePrefersReducedMotion } from "@/components/marketing/usePrefersReducedMotion";
import { revealOnScroll } from "@/components/marketing/scrollReveal";

const CARD_KEYS = ["quotes", "budget", "overview"] as const;

export default function MarketingProblem() {
  const { t } = useI18n();
  const reducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      if (headingRef.current && sectionRef.current) {
        revealOnScroll(
          headingRef.current,
          { y: 28, opacity: 0, duration: 0.7, ease: "power2.out" },
          { trigger: sectionRef.current, start: "top 80%" },
        );
      }

      if (cardsRef.current) {
        revealOnScroll(
          cardsRef.current.children,
          { y: 36, opacity: 0, duration: 0.75, stagger: 0.12, ease: "power2.out" },
          { trigger: cardsRef.current, start: "top 85%" },
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} data-testid="marketing-problem" className="bg-gradient-to-b from-background to-renovation-surface/30 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2
          ref={headingRef}
          className="max-w-3xl text-3xl font-medium tracking-tight text-foreground sm:text-4xl"
        >
          {t("marketing.problem.heading")}
        </h2>
        <div ref={cardsRef} className="mt-12 grid gap-5 sm:grid-cols-3">
          {CARD_KEYS.map((key) => (
            <Card
              key={key}
              data-testid={`marketing-problem-${key}`}
              className="transition-all duration-300 hover:-translate-y-1 hover:shadow-renovation-card"
            >
              <h3 className="text-lg font-medium text-foreground">
                {t(`marketing.problem.cards.${key}.title`)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-renovation-concrete">
                {t(`marketing.problem.cards.${key}.body`)}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
