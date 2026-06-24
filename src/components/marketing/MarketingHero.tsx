"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useI18n } from "@/i18n/provider";
import { HERO_IMAGE, MARKETING_SECTION_IDS, REGISTER_HREF } from "@/components/marketing/constants";
import { useMarketingScrollEffects } from "@/components/marketing/useMarketingScrollEffects";

gsap.registerPlugin(ScrollTrigger);

export default function MarketingHero() {
  const { t } = useI18n();
  const scrollEffects = useMarketingScrollEffects();
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !pinRef.current) return;

    const ctx = gsap.context(() => {
      if (!scrollEffects) {
        gsap.set(revealRef.current, { opacity: 1, y: 0 });
        return;
      }

      if (!bgRef.current || !overlayRef.current || !contentRef.current || !revealRef.current) return;

      gsap.from(contentRef.current.children, {
        y: 32,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power2.out",
        delay: 0.15,
      });

      gsap.set(bgRef.current, { scale: 1.15 });
      gsap.set(revealRef.current, { opacity: 0, y: 40 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=120%",
          pin: pinRef.current,
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      tl.to(
        bgRef.current,
        { scale: 1, ease: "none", duration: 1 },
        0,
      )
        .to(
          overlayRef.current,
          { opacity: 0.85, ease: "none", duration: 0.6 },
          0,
        )
        .to(
          contentRef.current,
          { opacity: 0, y: -36, ease: "power1.inOut", duration: 0.45 },
          0.2,
        )
        .to(
          revealRef.current,
          { opacity: 1, y: 0, ease: "power2.out", duration: 0.45 },
          0.45,
        );
    }, sectionRef);

    return () => ctx.revert();
  }, [scrollEffects]);

  const handleHeroImageLoad = () => {
    ScrollTrigger.refresh();
  };

  return (
    <section ref={sectionRef} data-testid="marketing-hero" className="relative">
      <div ref={pinRef} className="relative flex min-h-dvh items-center overflow-hidden">
        <div ref={bgRef} className="absolute inset-0 origin-center will-change-transform" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            onLoad={handleHeroImageLoad}
          />
        </div>

        <div
          ref={overlayRef}
          className="absolute inset-0 bg-gradient-to-b from-stone-950/55 via-stone-950/45 to-stone-950/75"
          style={{ opacity: 0.65 }}
          aria-hidden="true"
        />

        <div
          ref={contentRef}
          className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pb-28 lg:pt-36"
        >
          <h1 className="max-w-3xl text-4xl font-medium leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {t("marketing.hero.heading")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
            {t("marketing.hero.subtitle")}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={REGISTER_HREF}
              data-testid="marketing-hero-cta-primary"
              className="inline-flex items-center justify-center rounded-lg bg-renovation-accent px-6 py-3 text-base font-medium text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-renovation-steel hover:shadow-xl"
            >
              {t("marketing.hero.ctaPrimary")}
            </Link>
            <a
              href={`#${MARKETING_SECTION_IDS.features}`}
              data-testid="marketing-hero-cta-secondary"
              className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-base font-medium text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/15"
            >
              {t("marketing.hero.ctaSecondary")}
            </a>
          </div>
        </div>

        <div
          ref={revealRef}
          data-testid="marketing-hero-reveal"
          className={[
            "pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-4xl px-4 pb-24 text-center sm:px-6 lg:px-8",
            scrollEffects ? "opacity-0" : "opacity-100",
          ].join(" ")}
        >
          <p className="text-2xl font-medium leading-snug tracking-tight text-white sm:text-3xl lg:text-4xl">
            {t("marketing.hero.revealHeading")}
          </p>
          <p className="mt-4 text-base leading-relaxed text-white/75 sm:text-lg">
            {t("marketing.hero.revealSubtitle")}
          </p>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
