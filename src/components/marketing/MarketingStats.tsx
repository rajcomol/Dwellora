"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useI18n } from "@/i18n/provider";
import { usePrefersReducedMotion } from "@/components/marketing/usePrefersReducedMotion";

gsap.registerPlugin(ScrollTrigger);

const STAT_KEYS = ["modules", "dashboard", "coach"] as const;

export default function MarketingStats() {
  const { t } = useI18n();
  const reducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const counters = sectionRef.current.querySelectorAll<HTMLElement>("[data-count-value]");
    if (!counters.length) return;

    const ctx = gsap.context(() => {
      counters.forEach((el) => {
        const end = Number(el.dataset.countValue ?? "0");
        const suffix = el.dataset.countSuffix ?? "";

        if (reducedMotion) {
          el.textContent = `${end}${suffix}`;
          return;
        }

        const state = { value: 0 };
        ScrollTrigger.create({
          trigger: el,
          start: "top 90%",
          once: true,
          onEnter: () => {
            gsap.to(state, {
              value: end,
              duration: 1.6,
              ease: "power2.out",
              onUpdate: () => {
                el.textContent = `${Math.round(state.value)}${suffix}`;
              },
            });
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} data-testid="marketing-stats" className="bg-gradient-to-b from-renovation-surface/30 via-renovation-surface/60 to-background py-14">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
        {STAT_KEYS.map((key) => (
          <div key={key} className="text-center">
            <p
              data-count-value={t(`marketing.stats.${key}.value`)}
              data-count-suffix={t(`marketing.stats.${key}.suffix`)}
              className="text-4xl font-medium tracking-tight text-renovation-accent sm:text-5xl"
            >
              {reducedMotion
                ? `${t(`marketing.stats.${key}.value`)}${t(`marketing.stats.${key}.suffix`)}`
                : `0${t(`marketing.stats.${key}.suffix`)}`}
            </p>
            <p className="mt-2 text-sm text-renovation-concrete">{t(`marketing.stats.${key}.label`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
