import { getPlannerQuota } from "@/lib/planner/dailyLimit";
import { createUserSupabaseFromRequest } from "@/lib/supabase/api-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await createUserSupabaseFromRequest(req);
  if (!auth) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const quota = await getPlannerQuota(auth.client, auth.userId);
    return Response.json(quota, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Quota lookup failed.";
    console.error("planner/quota", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
