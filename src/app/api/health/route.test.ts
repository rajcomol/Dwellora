import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns ok payload", async () => {
    const res = await GET(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean; timestamp?: string };
    expect(body.ok).toBe(true);
    expect(typeof body.timestamp).toBe("string");
  });
});
