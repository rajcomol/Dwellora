/**
 * Canonical public URL for redirects (email confirmation, invite links).
 * Prefer NEXT_PUBLIC_SITE_URL in production; browser falls back to current origin in dev.
 */
export function getPublicSiteUrlClient(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function getPublicSiteUrlServer(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    try {
      return new URL(`https://${vercel}`).origin;
    } catch {
      /* ignore */
    }
  }
  return "";
}
