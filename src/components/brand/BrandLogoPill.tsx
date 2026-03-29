"use client";

import { useI18n } from "@/i18n/provider";

type Props = {
  /** `compact`: header — lijn met `AuthHeader` (text-xs / min-h-10). `default`: login. */
  size?: "default" | "compact";
  className?: string;
};

export default function BrandLogoPill({ size = "default", className }: Props) {
  const { t } = useI18n();
  const name = t("brand.name");
  const compact = size === "compact";

  return (
    <div
      className={
        compact
          ? `glass-card inline-flex max-w-full items-center justify-center rounded-full px-3 py-1.5 sm:px-3.5 sm:py-2 ${className ?? ""}`
          : `glass-card inline-flex max-w-full items-center justify-center rounded-full px-6 py-3.5 sm:px-8 sm:py-4 ${className ?? ""}`
      }
    >
      <div
        className={
          compact
            ? "flex max-w-[min(92vw,220px)] items-center gap-1.5 whitespace-nowrap text-white sm:gap-2"
            : "flex max-w-[min(92vw,280px)] items-center gap-2.5 whitespace-nowrap text-white sm:gap-3"
        }
      >
        <svg
          className={
            compact
              ? "h-6 w-6 shrink-0 sm:h-6 sm:w-6"
              : "h-9 w-9 shrink-0 sm:h-10 sm:w-10"
          }
          viewBox="18 4 16 15"
          fill="currentColor"
          aria-hidden
        >
          <path d="M18 12 L26 4 L34 12 H18 Z" />
          <rect x="20" y="12" width="12" height="7" rx="0.5" />
        </svg>
        <span
          className={
            compact
              ? "text-sm font-bold leading-none tracking-tight sm:text-[0.9375rem]"
              : "text-[1.625rem] font-bold leading-none tracking-tight sm:text-[1.7rem]"
          }
        >
          {name}
        </span>
      </div>
    </div>
  );
}
