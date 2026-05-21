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
  /** `topbar` = 28px hoog in de dashboard-topbar; `compact`/`header` = overige plekken. */
  size?: "default" | "compact" | "header" | "topbar";
  className?: string;
};

export default function BrandLogo({ size = "default", className = "" }: Props) {
  const { t } = useI18n();
  const name = t("brand.name");
  const compact = size === "compact";
  const header = size === "header";
  const topbar = size === "topbar";

  if (topbar) {
    return (
      <Image
        src={LOGO_SRC}
        width={47}
        height={28}
        alt={name}
        priority
        className={`block shrink-0 [filter:brightness(0)] dark:[filter:none] ${className}`.trim()}
      />
    );
  }

  const cls = header
    ? `h-12 w-auto max-w-full object-contain object-center sm:h-14 lg:h-16 [filter:brightness(0)] dark:[filter:none] ${className}`.trim()
    : compact
      ? `h-11 w-auto max-w-[17rem] object-contain object-center sm:h-12 sm:max-w-[20rem] md:h-14 md:max-w-[24rem] [filter:brightness(0)] dark:[filter:none] ${className}`.trim()
      : `h-auto w-full max-w-full min-w-0 object-contain drop-shadow-[0_1px_3px_rgb(0_0_0/0.35)] ${className}`.trim();

  const sizes =
    header
      ? "(max-width: 640px) 320px, (max-width: 1024px) 384px, 448px"
      : compact
        ? "(max-width: 640px) 272px, (max-width: 768px) 320px, 384px"
        : "(max-width: 640px) 464px, 512px";

  return (
    <Image
      src={LOGO_SRC}
      width={LOGO_W}
      height={LOGO_H}
      alt={name}
      sizes={sizes}
      priority={size === "default" || size === "header" || size === "compact"}
      className={cls}
    />
  );
}
