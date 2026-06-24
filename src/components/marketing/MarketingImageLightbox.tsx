"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useI18n } from "@/i18n/provider";
import {
  getMarketingImageDimensions,
  MARKETING_SCREENSHOT_QUALITY,
  MARKETING_SCREENSHOT_UNOPTIMIZED,
} from "@/components/marketing/constants";

type Props = {
  open: boolean;
  src: string;
  alt: string;
  onClose: () => void;
};

export default function MarketingImageLightbox({ open, src, alt, onClose }: Props) {
  const { t } = useI18n();
  const { width, height } = getMarketingImageDimensions(src);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      data-testid="marketing-lightbox"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
    >
      <button
        type="button"
        aria-label={t("marketing.features.lightboxClose")}
        data-testid="marketing-lightbox-backdrop"
        className="absolute inset-0 bg-stone-950/85"
        onClick={onClose}
      />

      <div className="relative z-10 max-h-[90vh]" style={{ maxWidth: width }}>
        <button
          type="button"
          aria-label={t("marketing.features.lightboxClose")}
          data-testid="marketing-lightbox-close"
          className="absolute -right-2 -top-2 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-stone-900/90 text-white shadow-lg transition-colors hover:bg-stone-800 sm:-right-4 sm:-top-4"
          onClick={onClose}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="overflow-hidden rounded-xl border border-white/15 bg-stone-900 shadow-2xl">
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            quality={MARKETING_SCREENSHOT_QUALITY}
            unoptimized={MARKETING_SCREENSHOT_UNOPTIMIZED}
            className="max-h-[85vh] h-auto w-auto max-w-full object-contain"
            sizes="100vw"
            priority
          />
        </div>
      </div>
    </div>
  );
}
