"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { usePrefersReducedMotion } from "@/components/marketing/usePrefersReducedMotion";
import { revealOnScroll } from "@/components/marketing/scrollReveal";

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_POSITION = 50;
const KEYBOARD_STEP = 2;

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export default function MarketingSfeerbeeldShowcase() {
  const { t } = useI18n();
  const reducedMotion = usePrefersReducedMotion();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [position, setPosition] = useState(DEFAULT_POSITION);

  const sectionRef = useRef<HTMLElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Faalveilige reveal-on-scroll: de sectie faadt subtiel in bij binnenscrollen,
  // maar blijft zichtbaar als de trigger niet vuurt (nooit permanent opacity 0).
  useEffect(() => {
    if (reducedMotion || !sectionRef.current) return;
    const ctx = gsap.context(() => {
      revealOnScroll(
        sectionRef.current!.querySelectorAll("[data-reveal]"),
        { opacity: 0, y: 24, duration: 0.6, ease: "power2.out", stagger: 0.08 },
        { trigger: sectionRef.current!, start: "top 80%" },
      );
    }, sectionRef);
    return () => ctx.revert();
  }, [reducedMotion]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = compareRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const pct = clamp(((clientX - rect.left) / rect.width) * 100);
    // rAF-coalescing: bij snel slepen niet meer dan één update per frame.
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setPosition(pct));
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };

  const stopDragging = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        setPosition((p) => clamp(p - KEYBOARD_STEP));
        e.preventDefault();
        break;
      case "ArrowRight":
      case "ArrowUp":
        setPosition((p) => clamp(p + KEYBOARD_STEP));
        e.preventDefault();
        break;
      case "Home":
        setPosition(0);
        e.preventDefault();
        break;
      case "End":
        setPosition(100);
        e.preventDefault();
        break;
      default:
        break;
    }
  };

  const rounded = Math.round(position);

  return (
    <section
      id={MARKETING_SECTION_IDS.sfeerbeeldShowcase}
      ref={sectionRef}
      data-testid="marketing-sfeerbeeld-showcase"
      className="relative bg-gradient-to-b from-background via-renovation-surface/40 to-background py-20 sm:py-28"
    >
      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
        <div data-reveal className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
          <h3 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
            {t("marketing.sfeerbeeldShowcase.title")}
          </h3>
          <p className="mt-4 text-base leading-relaxed text-renovation-concrete sm:text-lg">
            {t("marketing.sfeerbeeldShowcase.body")}
          </p>
        </div>

        <div
          data-reveal
          ref={compareRef}
          data-testid="marketing-feature-sfeerbeeld"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          className="relative mx-auto aspect-[16/10] w-full max-h-[min(58vh,720px)] cursor-ew-resize touch-pan-y select-none overflow-hidden sm:rounded-2xl lg:max-w-none"
        >
          {/* Onderlaag: de situatie VOOR de verbouwing (volledig zichtbaar). */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src={SFEERBEELD_BEFORE}
              alt={t("marketing.sfeerbeeldShowcase.beforeAlt")}
              fill
              quality={MARKETING_SCREENSHOT_QUALITY}
              unoptimized={MARKETING_SCREENSHOT_UNOPTIMIZED}
              className="object-cover object-center"
              sizes={MARKETING_SCREENSHOT_SIZES}
              onLoad={() => ScrollTrigger.refresh()}
              priority
              draggable={false}
            />
          </div>

          {/* Bovenlaag: het AI-sfeerbeeld NA, afgekapt op de sliderpositie. */}
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          >
            <Image
              src={SFEERBEELD_AFTER}
              alt={t("marketing.sfeerbeeldShowcase.afterAlt")}
              fill
              quality={MARKETING_SCREENSHOT_QUALITY}
              unoptimized={MARKETING_SCREENSHOT_UNOPTIMIZED}
              className="object-cover object-center"
              sizes={MARKETING_SCREENSHOT_SIZES}
              onLoad={() => ScrollTrigger.refresh()}
              priority
              draggable={false}
            />
          </div>

          <span className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-white/30 bg-stone-950/55 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white backdrop-blur-md sm:left-6 sm:top-6">
            {t("marketing.sfeerbeeldShowcase.beforeLabel")}
          </span>
          <span className="pointer-events-none absolute right-4 top-4 z-20 rounded-full border border-white/30 bg-stone-950/55 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white backdrop-blur-md sm:right-6 sm:top-6">
            {t("marketing.sfeerbeeldShowcase.afterLabel")}
          </span>

          {/* Sleep-handle op de scheidingslijn. */}
          <div
            role="slider"
            tabIndex={0}
            aria-label={t("marketing.sfeerbeeldShowcase.sliderAriaLabel")}
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={rounded}
            data-testid="marketing-sfeerbeeld-slider"
            onKeyDown={onKeyDown}
            className="group absolute inset-y-0 z-30 w-0 outline-none"
            style={{ left: `${position}%` }}
          >
            <div
              className="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.10)]"
              aria-hidden="true"
            />
            <div className="absolute left-0 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-renovation-accent/40 bg-white/90 text-renovation-accent shadow-md ring-renovation-accent ring-offset-2 backdrop-blur-md transition group-focus-visible:ring-2">
              <ChevronLeft className="-mr-1 h-4 w-4 shrink-0" aria-hidden="true" />
              <ChevronRight className="-ml-1 h-4 w-4 shrink-0" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div data-reveal className="mx-auto mt-6 max-w-2xl text-center sm:mt-8">
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

      <MarketingImageLightbox
        open={lightboxOpen}
        src={SFEERBEELD_AFTER}
        alt={t("marketing.sfeerbeeldShowcase.afterAlt")}
        onClose={() => setLightboxOpen(false)}
      />
    </section>
  );
}
