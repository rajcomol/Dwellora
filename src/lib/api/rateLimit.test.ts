import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clientIpFromRequest,
  rateLimitResponse,
  trustForwardedHeaders,
} from "@/lib/api/rateLimit";

describe("trustForwardedHeaders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is true in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(trustForwardedHeaders()).toBe(true);
  });

  it("is true on Vercel", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    expect(trustForwardedHeaders()).toBe(true);
  });

  it("is true when RATE_LIMIT_TRUST_FORWARDED=1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_TRUST_FORWARDED", "1");
    expect(trustForwardedHeaders()).toBe(true);
  });

  it("is false in production without trust", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", undefined);
    vi.stubEnv("RATE_LIMIT_TRUST_FORWARDED", undefined);
    expect(trustForwardedHeaders()).toBe(false);
  });

  it("is false when RATE_LIMIT_TRUST_FORWARDED=0", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RATE_LIMIT_TRUST_FORWARDED", "0");
    expect(trustForwardedHeaders()).toBe(false);
  });
});

describe("clientIpFromRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers cf-connecting-ip when trusted", () => {
    vi.stubEnv("NODE_ENV", "development");
    const req = new Request("http://x", {
      headers: {
        "cf-connecting-ip": "198.51.100.2",
        "x-forwarded-for": "203.0.113.1",
      },
    });
    expect(clientIpFromRequest(req)).toBe("198.51.100.2");
  });

  it("uses first x-forwarded-for hop when trusted", () => {
    vi.stubEnv("NODE_ENV", "development");
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    });
    expect(clientIpFromRequest(req)).toBe("203.0.113.5");
  });

  it("returns unknown when not trusted even with forwarded headers", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", undefined);
    vi.stubEnv("RATE_LIMIT_TRUST_FORWARDED", undefined);
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "203.0.113.5" },
    });
    expect(clientIpFromRequest(req)).toBe("unknown");
  });
});

describe("rateLimitResponse", () => {
  it("returns 429 with code and retryAfterSeconds after limit exceeded", async () => {
    const key = `unit-test-429-${Date.now()}-${Math.random()}`;
    expect(rateLimitResponse(key, 2, 60_000, { scope: "test", clientIp: "127.0.0.1" })).toBeNull();
    expect(rateLimitResponse(key, 2, 60_000, { scope: "test", clientIp: "127.0.0.1" })).toBeNull();
    const third = rateLimitResponse(key, 2, 60_000, { scope: "test", clientIp: "127.0.0.1" });
    expect(third).not.toBeNull();
    expect(third!.status).toBe(429);
    expect(third!.headers.get("Retry-After")).toBeTruthy();
    const body = (await third!.json()) as {
      error?: string;
      code?: string;
      retryAfterSeconds?: number;
    };
    expect(body.code).toBe("rate_limit_exceeded");
    expect(body.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(typeof body.error).toBe("string");
  });
});
