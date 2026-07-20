"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useI18n } from "@/i18n/provider";
import MarketingImageLightbox from "@/components/marketing/MarketingImageLightbox";
import {
  MARKETING_SCREENSHOT_QUALITY,
  MARKETING_SCREENSHOT_SIZES,
  MARKETING_SCREENSHOT_UNOPTIMIZED,
  MARKETING_SECTION_IDS,
  SFEERBEELD_AFTER,
  SFEERBEELD_BEFORE,
} from "@/components/marketing/constants";
import { useMarketingScrollEffects } from "@/components/marketing/useMarketingScrollEffects";

gsap.registerPlugin(ScrollTrigger);

export default function MarketingSfeerbeeldShowcase() {
  const { t } = useI18n();
  const scrollEffects = useMarketingScrollEffects();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<HTMLDivElement>(null);
  const beforeLabelRef = useRef<HTMLSpanElement>(null);
  const afterLabelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !pinRef.current) return;

    const ctx = gsap.context(() => {
      if (!scrollEffects) {
        gsap.set(afterRef.current, { clipPath: "inset(0 0% 0 0)" });
        return;
      }

      if (!afterRef.current) return;

      gsap.set(afterRef.current, { clipPath: "inset(0 100% 0 0)" });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=110%",
          pin: pinRef.current,
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      tl.to(afterRef.current, { clipPath: "inset(0 0% 0 0)", ease: "none", duration: 0.65 }, 0)
        .to(beforeLabelRef.current, { opacity: 0.35, ease: "none", duration: 0.35 }, 0.35)
        .to(afterLabelRef.current, { opacity: 1, ease: "none", duration: 0.35 }, 0.35);
    }, sectionRef);

    return () => ctx.revert();
  }, [scrollEffects]);

  const handleImageLoad = () => {
    ScrollTrigger.refresh();
  };

  return (
    <section
      id={MARKETING_SECTION_IDS.sfeerbeeldShowcase}
      ref={sectionRef}
      data-testid="marketing-sfeerbeeld-showcase"
      className="relative bg-gradient-to-b from-background via-renovation-surface/40 to-background"
    >
      <div ref={pinRef} className="relative flex min-h-dvh flex-col justify-center overflow-hidden py-20 sm:py-24">
        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
            <h3 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
              {t("marketing.sfeerbeeldShowcase.title")}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-renovation-concrete sm:text-lg">
              {t("marketing.sfeerbeeldShowcase.body")}
            </p>
          </div>

          <div
            data-testid="marketing-feature-sfeerbeeld"
            className="relative mx-auto aspect-[16/10] w-full max-h-[min(58vh,720px)] overflow-hidden sm:rounded-2xl lg:max-w-none"
          >
            <div className="absolute inset-0 z-0">
              <Image
                src={SFEERBEELD_BEFORE}
                alt={t("marketing.sfeerbeeldShowcase.beforeAlt")}
                fill
                quality={MARKETING_SCREENSHOT_QUALITY}
                unoptimized={MARKETING_SCREENSHOT_UNOPTIMIZED}
                className="object-cover object-center"
                sizes={MARKETING_SCREENSHOT_SIZES}
                onLoad={handleImageLoad}
                priority
              />
            </div>

            <div ref={afterRef} className="absolute inset-0 z-10 will-change-[clip-path]">
              <Image
                src={SFEERBEELD_AFTER}
                alt={t("marketing.sfeerbeeldShowcase.afterAlt")}
                fill
                quality={MARKETING_SCREENSHOT_QUALITY}
                unoptimized={MARKETING_SCREENSHOT_UNOPTIMIZED}
                className="object-cover object-center"
                sizes={MARKETING_SCREENSHOT_SIZES}
                onLoad={handleImageLoad}
                priority
              />
            </div>

            <span
              ref={beforeLabelRef}
              className="absolute left-4 top-4 z-20 rounded-full border border-white/30 bg-stone-950/55 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white backdrop-blur-md sm:left-6 sm:top-6"
            >
              {t("marketing.sfeerbeeldShowcase.beforeLabel")}
            </span>
            <span
              ref={afterLabelRef}
              className="absolute right-4 top-4 z-20 rounded-full border border-white/30 bg-stone-950/55 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white opacity-60 backdrop-blur-md sm:right-6 sm:top-6"
            >
              {t("marketing.sfeerbeeldShowcase.afterLabel")}
            </span>
          </div>

          <div className="mx-auto mt-6 max-w-2xl text-center sm:mt-8">
            <button
              type="button"
              data-testid="marketing-feature-sfeerbeeld-screenshot"
              className="text-sm font-medium text-renovation-accent underline-offset-4 transition-colors hover:text-renovation-steel hover:underline"
              onClick={() => setLightboxOpen(true)}
            >
              {t("marketing.features.enlargeHint")}
            </button>
          </div>
        </div>
      </div>

      <MarketingImageLightbox
        open={lightboxOpen}
        src={SFEERBEELD_AFTER}
        alt={t("marketing.sfeerbeeldShowcase.afterAlt")}
        onClose={() => setLightboxOpen(false)}
      />
    </section>
  );
}
