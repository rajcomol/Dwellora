"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useI18n } from "@/i18n/provider";
import { usePrefersReducedMotion } from "@/components/marketing/usePrefersReducedMotion";
import { MARKETING_SECTION_IDS } from "@/components/marketing/constants";
import { revealOnScroll } from "@/components/marketing/scrollReveal";

const FAQ_KEYS = ["cost", "mobile", "data", "sfeerbeeld", "collaborate", "cancel"] as const;

export default function MarketingFaq() {
  const { t } = useI18n();
  const reducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const baseId = useId();

  // Subtiele scroll-reveal in dezelfde stijl als de rest van de site.
  useEffect(() => {
    if (!sectionRef.current || reducedMotion) return;

    const items = sectionRef.current.querySelectorAll<HTMLElement>("[data-faq-item]");
    if (!items.length) return;

    const ctx = gsap.context(() => {
      revealOnScroll(
        items,
        { opacity: 0, y: 24, duration: 0.6, ease: "power2.out", stagger: 0.08 },
        { trigger: sectionRef.current!, start: "top 80%" },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      id={MARKETING_SECTION_IDS.faq}
      ref={sectionRef}
      data-testid="marketing-faq"
      className="bg-background py-20 sm:py-28"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          {t("marketing.faq.heading")}
        </h2>
        <p className="mt-4 text-lg text-renovation-concrete">{t("marketing.faq.subtitle")}</p>

        <div className="mt-10 divide-y divide-renovation-border overflow-hidden rounded-2xl border border-renovation-border bg-renovation-elevated">
          {FAQ_KEYS.map((key) => {
            const isOpen = openKey === key;
            const buttonId = `${baseId}-${key}-button`;
            const panelId = `${baseId}-${key}-panel`;

            return (
              <div key={key} data-faq-item data-testid={`marketing-faq-item-${key}`}>
                <h3 className="m-0">
                  <button
                    type="button"
                    id={buttonId}
                    data-testid={`marketing-faq-question-${key}`}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenKey((prev) => (prev === key ? null : key))}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-base font-medium text-foreground transition-colors hover:text-renovation-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-renovation-accent sm:px-6"
                  >
                    <span>{t(`marketing.faq.items.${key}.question`)}</span>
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      className={[
                        "h-5 w-5 shrink-0 text-renovation-concrete",
                        reducedMotion ? "" : "transition-transform duration-300 ease-out",
                        isOpen ? "rotate-180" : "",
                      ].join(" ")}
                    >
                      <path
                        d="M5 7.5 10 12.5 15 7.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  data-testid={`marketing-faq-answer-${key}`}
                  className={[
                    "grid px-5 text-renovation-concrete sm:px-6",
                    reducedMotion ? "" : "transition-[grid-template-rows] duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]",
                  ].join(" ")}
                >
                  <div className="overflow-hidden">
                    <p className="text-base leading-relaxed">{t(`marketing.faq.items.${key}.answer`)}</p>
                    {key === "data" ? (
                      <Link
                        href="/privacy"
                        className="mt-3 inline-flex items-center text-sm font-medium text-renovation-accent hover:text-renovation-steel"
                      >
                        {t("marketing.faq.privacyLink")}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
