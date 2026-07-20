"use client";

import Image from "next/image";
import { useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useI18n } from "@/i18n/provider";
import MarketingImageLightbox from "@/components/marketing/MarketingImageLightbox";
import {
  getMarketingImageDimensions,
  MARKETING_SCREENSHOT_QUALITY,
  MARKETING_SCREENSHOT_SIZES,
  MARKETING_SCREENSHOT_UNOPTIMIZED,
} from "@/components/marketing/constants";

type Props = {
  src: string;
  alt: string;
  testId: string;
};

export default function MarketingFeatureScreenshot({ src, alt, testId }: Props) {
  const { t } = useI18n();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { width, height } = getMarketingImageDimensions(src);

  return (
    <>
      <button
        type="button"
        data-feature-image
        data-testid={`${testId}-screenshot`}
        aria-label={`${alt}. ${t("marketing.features.enlargeHint")}`}
        className="group mx-auto w-full max-w-full cursor-zoom-in text-left transition-transform duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-renovation-accent/50"
        style={{ maxWidth: width }}
        onClick={() => setLightboxOpen(true)}
      >
        <div className="overflow-hidden rounded-2xl border border-renovation-border bg-renovation-elevated shadow-renovation-card transition-shadow duration-300 group-hover:shadow-lg">
          <div className="flex items-center gap-2 border-b border-renovation-border bg-renovation-muted/90 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" aria-hidden="true" />
            <span className="ml-1 truncate text-xs font-medium text-renovation-concrete">RenoTasker</span>
          </div>
          <div className="flex justify-center overflow-hidden bg-renovation-muted">
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              quality={MARKETING_SCREENSHOT_QUALITY}
              unoptimized={MARKETING_SCREENSHOT_UNOPTIMIZED}
              sizes={MARKETING_SCREENSHOT_SIZES}
              className="h-auto w-full object-contain object-top"
              style={{ maxWidth: width }}
              onLoad={() => ScrollTrigger.refresh()}
            />
          </div>
          <p className="border-t border-renovation-border bg-renovation-elevated px-4 py-2 text-center text-xs text-renovation-concrete">
            {t("marketing.features.enlargeHint")}
          </p>
        </div>
      </button>

      <MarketingImageLightbox
        open={lightboxOpen}
        src={src}
        alt={alt}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
