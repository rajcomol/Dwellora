export const HERO_IMAGE = "/marketing/woonkamer.png";

export const SFEERBEELD_BEFORE = "/marketing/before.png";

export const SFEERBEELD_AFTER = "/marketing/sfeerbeeld.png";

/** Intrinsieke pixelafmetingen van marketing-beelden (voor scherpe weergave zonder upscale). */
export const MARKETING_IMAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "/marketing/before.png": { width: 2048, height: 1536 },
  "/marketing/ruimtes.png": { width: 2558, height: 1269 },
  "/marketing/planning.png": { width: 2542, height: 1267 },
  "/marketing/dashboard.png": { width: 2544, height: 1267 },
  "/marketing/sfeerbeeld.png": { width: 1568, height: 779 },
  "/marketing/offertes.png": { width: 1568, height: 778 },
  "/marketing/kluscoach.png": { width: 445, height: 634 },
};

export const MARKETING_SCREENSHOT_SIZES = "(max-width: 768px) 100vw, 60vw";

export const MARKETING_SCREENSHOT_QUALITY = 100;

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
  pricing: "prijzen",
  about: "over",
} as const;

export const MARKETING_FEATURES_BEFORE_SHOWCASE = [
  {
    id: "ruimtes",
    testId: "marketing-feature-ruimtes",
    image: "/marketing/ruimtes.png",
    imageAlt: "RenoTasker ruimtes en taken",
    reverse: false,
  },
  {
    id: "planning",
    testId: "marketing-feature-planning",
    image: "/marketing/planning.png",
    imageAlt: "RenoTasker planning en tijdlijn",
    reverse: true,
  },
  {
    id: "budget",
    testId: "marketing-feature-budget",
    image: "/marketing/dashboard.png",
    imageAlt: "RenoTasker budget- en bouwdepotoverzicht",
    reverse: false,
  },
] as const;

export const MARKETING_FEATURES_AFTER_SHOWCASE = [
  {
    id: "offertes",
    testId: "marketing-feature-offertes",
    image: "/marketing/offertes.png",
    imageAlt: "RenoTasker offertes vergelijken",
    reverse: true,
  },
  {
    id: "kluscoach",
    testId: "marketing-feature-kluscoach",
    image: "/marketing/kluscoach.png",
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
