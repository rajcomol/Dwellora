import { clientIpFromRequest, RATE_LIMIT, rateLimitResponse } from "@/lib/api/rateLimit";

export async function GET(request: Request) {
  const ip = clientIpFromRequest(request);
  const rl = rateLimitResponse(`health:${ip}`, RATE_LIMIT.health.limit, RATE_LIMIT.health.windowMs, {
    scope: "health",
    clientIp: ip,
  });
  if (rl) return rl;

  // Geen commit-SHA in de body: dat is onnodige info-disclosure in productie.
  // Buiten productie geven we hem als debug-header terug voor diagnose.
  const headers: Record<string, string> = {};
  if (process.env.NODE_ENV !== "production") {
    const commit = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
    if (commit) headers["x-debug-commit"] = commit;
  }

  return Response.json(
    {
      ok: true,
      app: "renotasker",
      timestamp: new Date().toISOString(),
    },
    { headers }
  );
}

