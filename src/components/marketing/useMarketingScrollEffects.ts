"use client";

import { useIsMobile } from "@/components/marketing/useIsMobile";
import { usePrefersReducedMotion } from "@/components/marketing/usePrefersReducedMotion";

/** Pin/scrub scroll effects — uit bij reduced motion of mobiel (<768px). */
export function useMarketingScrollEffects(): boolean {
  const reducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  return !reducedMotion && !isMobile;
}
