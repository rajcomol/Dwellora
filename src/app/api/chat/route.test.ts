import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";

describe("POST /api/chat", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv("RATE_LIMIT_TRUST_FORWARDED", "1");
  });

  it("returns 400 when message missing", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns mock response without auth when no API key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({ message: "Hello" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { response?: string; threadId?: string | null };
    expect(data.response ?? "").toContain("Mock response");
    expect(data.threadId ?? null).toBeNull();
  });
});
