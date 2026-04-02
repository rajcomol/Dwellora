import { clientIpFromRequest, RATE_LIMIT, rateLimitResponse } from "@/lib/api/rateLimit";

export async function GET(request: Request) {
  const ip = clientIpFromRequest(request);
  const rl = rateLimitResponse(`health:${ip}`, RATE_LIMIT.health.limit, RATE_LIMIT.health.windowMs, {
    scope: "health",
    clientIp: ip,
  });
  if (rl) return rl;

  return Response.json({
    ok: true,
    app: "renotasker",
    timestamp: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  });
}

