import { clientIpFromRequest, RATE_LIMIT, rateLimitResponse } from "@/lib/api/rateLimit";
import { createSignedRenderUrl } from "@/lib/planner/renderStorage";
import { createUserSupabaseFromRequest } from "@/lib/supabase/api-auth";

export const runtime = "nodejs";

/**
 * Geeft een verse signed URL terug voor een bekend render-pad. De bucket is privé,
 * dus signed URLs verlopen; de frontend haalt hiermee een nieuwe op wanneer een
 * afbeelding niet meer laadt. Valideert dat het pad met de userId van de caller
 * begint (voorkomt IDOR: geen renders van andere gebruikers opvragen).
 */
export async function GET(req: Request) {
  const ip = clientIpFromRequest(req);
  const rl = rateLimitResponse(
    `planner:render-url:${ip}`,
    RATE_LIMIT.plannerRenderUrl.limit,
    RATE_LIMIT.plannerRenderUrl.windowMs,
    { scope: "planner:render-url", clientIp: ip }
  );
  if (rl) return rl;

  const auth = await createUserSupabaseFromRequest(req);
  if (!auth) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const path = new URL(req.url).searchParams.get("path")?.trim();
  if (!path) {
    return Response.json({ error: "Pad ontbreekt." }, { status: 400 });
  }

  // Pad moet met de userId van de caller beginnen (geen data-URL, geen ../, geen andere gebruiker).
  const prefix = `${auth.userId}/`;
  if (!path.startsWith(prefix) || path.includes("..")) {
    return Response.json({ error: "Geen toegang tot dit pad." }, { status: 403 });
  }

  try {
    const url = await createSignedRenderUrl(auth.client, path);
    return Response.json({ url }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("planner/render-url", (e as Error)?.message);
    return Response.json({ error: "Kon signed URL niet maken." }, { status: 502 });
  }
}
