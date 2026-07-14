import type { MetadataRoute } from "next";

const FALLBACK_SITE_URL = "https://www.renotasker.com";

function canonicalHost(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return explicit || FALLBACK_SITE_URL;
}

export default function robots(): MetadataRoute.Robots {
  const host = canonicalHost();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api", "/login", "/auth", "/invite"],
    },
    sitemap: `${host}/sitemap.xml`,
    host,
  };
}
