"use client";

import Image from "next/image";
import { useI18n } from "@/i18n/provider";

/**
 * Transparante lockup: `renotasker-logo-new.png` (gebouwd via `scripts/build-renotasker-logo-transparent.mjs`).
 * Geen `?v=` op de URL: Next.js 16 vereist dan `images.localPatterns` voor elke queryvariant.
 */
const LOGO_SRC = "/brand/renotasker-logo-new.png";
const LOGO_W = 958;
const LOGO_H = 566;

type Props = {
  /** Dashboard-header: klein; op lichte achtergrond zwart via `brightness(0)`, op dark origineel. */
  size?: "default" | "compact";
  className?: string;
};

export default function BrandLogo({ size = "default", className = "" }: Props) {
  const { t } = useI18n();
  const name = t("brand.name");
  const compact = size === "compact";

  const cls = compact
    ? `h-7 w-auto max-w-[12rem] object-contain object-center sm:h-8 sm:max-w-[13rem] [filter:brightness(0)] dark:[filter:none] ${className}`.trim()
    : `h-auto w-full max-w-full min-w-0 object-contain drop-shadow-[0_1px_3px_rgb(0_0_0/0.35)] ${className}`.trim();

  return (
    <Image
      src={LOGO_SRC}
      width={LOGO_W}
      height={LOGO_H}
      alt={name}
      sizes={compact ? "(max-width: 640px) 196px, 234px" : "(max-width: 640px) 464px, 512px"}
      priority={!compact}
      className={cls}
    />
  );
}
