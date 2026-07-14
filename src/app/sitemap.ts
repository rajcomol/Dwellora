import type { MetadataRoute } from "next";

const FALLBACK_SITE_URL = "https://www.renotasker.com";

function canonicalHost(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return explicit || FALLBACK_SITE_URL;
}

/** Alleen publieke marketingroutes; app-routes worden niet geïndexeerd. */
const PUBLIC_ROUTES = ["/", "/privacy"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const host = canonicalHost();
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: route === "/" ? `${host}/` : `${host}${route}`,
    lastModified,
  }));
}
