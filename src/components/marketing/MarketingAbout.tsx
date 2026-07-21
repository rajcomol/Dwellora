"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useI18n } from "@/i18n/provider";
import { usePrefersReducedMotion } from "@/components/marketing/usePrefersReducedMotion";
import { MARKETING_SECTION_IDS } from "@/components/marketing/constants";
import { revealOnScroll } from "@/components/marketing/scrollReveal";

const FOUNDER_IMAGE = "/marketing/oprichter.webp";

export default function MarketingAbout() {
  const { t } = useI18n();
  const reducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current || reducedMotion) return;

    const items = sectionRef.current.querySelectorAll<HTMLElement>("[data-about-reveal]");
    if (!items.length) return;

    const ctx = gsap.context(() => {
      revealOnScroll(
        items,
        { opacity: 0, y: 24, duration: 0.6, ease: "power2.out", stagger: 0.1 },
        { trigger: sectionRef.current!, start: "top 80%" },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      id={MARKETING_SECTION_IDS.about}
      ref={sectionRef}
      data-testid="marketing-about"
      className="bg-renovation-surface py-20 sm:py-28"
    >
      <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 sm:px-6 lg:grid-cols-[320px_1fr] lg:gap-16 lg:px-8">
        <figure data-about-reveal className="m-0">
          <div className="overflow-hidden rounded-2xl border border-renovation-border bg-renovation-muted/40 shadow-renovation-card">
            <Image
              src={FOUNDER_IMAGE}
              alt="Rajco Mol, bedenker van RenoTasker"
              width={640}
              height={800}
              className="h-auto w-full object-cover"
              sizes="(max-width: 1024px) 100vw, 320px"
            />
          </div>
          <figcaption className="mt-4 text-center lg:text-left">
            <p className="text-base font-medium text-foreground">{t("marketing.about.name")}</p>
            <p
              data-testid="marketing-about-role"
              className="mt-0.5 text-sm text-renovation-concrete"
            >
              {t("marketing.about.role")}
            </p>
          </figcaption>
        </figure>

        <div data-about-reveal>
          <h2 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            {t("marketing.about.heading")}
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-renovation-concrete">
            <p className="text-lg font-medium italic leading-snug text-foreground sm:text-xl">
              {t("marketing.about.intro")}
            </p>
            <p>{t("marketing.about.body1")}</p>
            <p>{t("marketing.about.body2")}</p>
            <p>{t("marketing.about.body3")}</p>
            <p className="font-medium italic text-foreground">{t("marketing.about.body4")}</p>
            <div>
              <p>{t("marketing.about.body5a")}</p>
              <blockquote className="mt-2 border-l-2 border-renovation-accent/50 pl-4 text-base font-medium italic text-foreground">
                {t("marketing.about.body5quote")}
              </blockquote>
            </div>
            <p>{t("marketing.about.body6")}</p>
            <p>{t("marketing.about.body7")}</p>
            <p>{t("marketing.about.body8")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
