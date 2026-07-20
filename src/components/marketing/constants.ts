export const HERO_IMAGE = "/marketing/woonkamer.webp";

// Bestandsnamen zijn historisch: sfeerbeeld.webp = situatie vóór, before.webp = AI-resultaat.
export const SFEERBEELD_BEFORE = "/marketing/sfeerbeeld.webp";

export const SFEERBEELD_AFTER = "/marketing/before.webp";

/** Intrinsieke pixelafmetingen van marketing-beelden (voor scherpe weergave zonder upscale). */
export const MARKETING_IMAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "/marketing/before.webp": { width: 2048, height: 1536 },
  "/marketing/ruimtes.webp": { width: 2558, height: 1269 },
  "/marketing/planning.webp": { width: 2542, height: 1267 },
  "/marketing/dashboard.webp": { width: 2544, height: 1267 },
  "/marketing/sfeerbeeld.webp": { width: 1568, height: 779 },
  "/marketing/offertes.webp": { width: 1568, height: 778 },
  "/marketing/kluscoach.webp": { width: 445, height: 634 },
};

export const MARKETING_SCREENSHOT_SIZES = "(max-width: 768px) 100vw, 60vw";

export const MARKETING_SCREENSHOT_QUALITY = 85;

/** PNG/WebP-screenshots niet opnieuw comprimeren — behoudt scherpte. */
export const MARKETING_SCREENSHOT_UNOPTIMIZED = true;

export function getMarketingImageDimensions(src: string): { width: number; height: number } {
  return MARKETING_IMAGE_DIMENSIONS[src] ?? { width: 1600, height: 1000 };
}

/** Pin/scrub-effecten uitschakelen onder deze breedte (px). */
export const MARKETING_MOBILE_MAX_WIDTH = 767;

export const REGISTER_HREF = "/login/register";

export const MARKETING_SECTION_IDS = {
  features: "functies",
  sfeerbeeldShowcase: "sfeerbeeld",
  pricing: "prijzen",
  faq: "faq",
  about: "over",
} as const;

export const MARKETING_FEATURES_BEFORE_SHOWCASE = [
  {
    id: "ruimtes",
    testId: "marketing-feature-ruimtes",
    image: "/marketing/ruimtes.webp",
    imageAlt: "RenoTasker ruimtes en taken",
    reverse: false,
  },
  {
    id: "planning",
    testId: "marketing-feature-planning",
    image: "/marketing/planning.webp",
    imageAlt: "RenoTasker planning en tijdlijn",
    reverse: true,
  },
  {
    id: "budget",
    testId: "marketing-feature-budget",
    image: "/marketing/dashboard.webp",
    imageAlt: "RenoTasker budget- en bouwdepotoverzicht",
    reverse: false,
  },
] as const;

export const MARKETING_FEATURES_AFTER_SHOWCASE = [
  {
    id: "offertes",
    testId: "marketing-feature-offertes",
    image: "/marketing/offertes.webp",
    imageAlt: "RenoTasker offertes vergelijken",
    reverse: true,
  },
  {
    id: "kluscoach",
    testId: "marketing-feature-kluscoach",
    image: "/marketing/kluscoach.webp",
    imageAlt: "RenoTasker kluscoach",
    reverse: false,
  },
] as const;

export const MARKETING_FEATURES = [
  ...MARKETING_FEATURES_BEFORE_SHOWCASE,
  ...MARKETING_FEATURES_AFTER_SHOWCASE,
] as const;

export type MarketingFeature = (typeof MARKETING_FEATURES)[number];
export type MarketingFeatureId = MarketingFeature["id"];
