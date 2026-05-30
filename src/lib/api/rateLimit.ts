import { createHash } from "node:crypto";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

/**
 * Named windows/limits for reuse across route handlers (per-process; resets on cold start).
 * Login/register/password flows hit Supabase Auth from the browser — configure limits/CAPTCHA there;
 * this module covers our Route Handlers (e.g. `/auth/confirm`).
 */
export const RATE_LIMIT = {
  authConfirm: { limit: 25, windowMs: 60_000 },
  health: { limit: 120, windowMs: 60_000 },
  preferencesLocale: { limit: 45, windowMs: 60_000 },
  collaborationGet: { limit: 90, windowMs: 60_000 },
  chatGet: { limit: 120, windowMs: 60_000 },
  chatPostAuthenticated: { limit: 60, windowMs: 60_000 },
  chatPostAnonymous: { limit: 20, windowMs: 60_000 },
  documentsSummarize: { limit: 24, windowMs: 60_000 },
  documentsCompare: { limit: 16, windowMs: 60_000 },
  plannerVisualiseer: { limit: 8, windowMs: 60_000 },
  invitesAccept: { limit: 30, windowMs: 60_000 },
  invitesPost: { limit: 20, windowMs: 60_000 },
  /** Public token lookup for invite UX (service role); keep strict. */
  invitesPreview: { limit: 20, windowMs: 60_000 },
} as const;

export type RateLimitLogContext = {
  /** Shown in logs on 429, e.g. `chat:post` */
  scope: string;
  /** Used for a short hash in logs (not full IP) */
  clientIp?: string;
};

function prune(now: number) {
  if (buckets.size <= MAX_KEYS) return;
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
  }
}

function hashForLog(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

/**
 * When true, `x-forwarded-for` / `x-real-ip` / CDN headers are used. Set `RATE_LIMIT_TRUST_FORWARDED=1`
 * behind your own reverse proxy, or rely on `VERCEL=1`. In other production setups without trust,
 * forwarded headers are ignored (spoofing); all clients may share the `unknown` bucket unless you
 * configure trust — set `RATE_LIMIT_TRUST_FORWARDED=1` on the app behind nginx/caddy.
 */
export function trustForwardedHeaders(): boolean {
  if (process.env.RATE_LIMIT_TRUST_FORWARDED === "0") return false;
  if (process.env.RATE_LIMIT_TRUST_FORWARDED === "1") return true;
  if (process.env.VERCEL === "1") return true;
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

/**
 * Best-effort client IP for rate limiting. Prefer platform/CDN headers when trust applies.
 */
export function clientIpFromRequest(req: Request): string {
  if (!trustForwardedHeaders()) {
    return "unknown";
  }
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const trueClient = req.headers.get("true-client-ip")?.trim();
  if (trueClient) return trueClient;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export type RateLimitResponseOptions = RateLimitLogContext;

/** Best-effort per-process limiter (suitable for Node route handlers; resets on cold start). */
export function rateLimitResponse(
  key: string,
  limit: number,
  windowMs: number,
  options?: RateLimitResponseOptions
): Response | null {
  const now = Date.now();
  prune(now);
  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    const ipPart =
      options?.clientIp && options.clientIp !== "unknown"
        ? ` ipHash=${hashForLog(options.clientIp)}`
        : "";
    console.warn(`[rate_limit] ${options?.scope ?? key}${ipPart}`);
    return Response.json(
      {
        error: "Too many requests. Try again shortly.",
        code: "rate_limit_exceeded",
        retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      }
    );
  }
  return null;
}
