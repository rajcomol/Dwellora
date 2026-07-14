import type { Metadata } from "next";
import MarketingLanding from "@/components/marketing/MarketingLanding";
import { HERO_IMAGE } from "@/components/marketing/constants";
import nl from "@/i18n/locales/nl.json";

export const metadata: Metadata = {
  title: nl.meta.marketingTitle,
  description: nl.meta.marketingDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: nl.meta.marketingTitle,
    description: nl.meta.marketingDescription,
    locale: "nl_NL",
    type: "website",
    images: [
      {
        url: HERO_IMAGE,
        width: 2400,
        height: 1600,
        alt: nl.meta.marketingTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: nl.meta.marketingTitle,
    description: nl.meta.marketingDescription,
    images: [HERO_IMAGE],
  },
};

export default function HomePage() {
  return <MarketingLanding />;
}
