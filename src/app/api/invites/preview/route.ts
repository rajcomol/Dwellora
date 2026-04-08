import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { clientIpFromRequest, RATE_LIMIT, rateLimitResponse } from "@/lib/api/rateLimit";

export const runtime = "nodejs";

const TOKEN_HEX_LEN = 64;

export async function GET(req: Request) {
  const ip = clientIpFromRequest(req);
  const rl = rateLimitResponse(`invites:preview:${ip}`, RATE_LIMIT.invitesPreview.limit, RATE_LIMIT.invitesPreview.windowMs, {
    scope: "invites:preview",
    clientIp: ip,
  });
  if (rl) return rl;

  const url = new URL(req.url);
  const raw = url.searchParams.get("token")?.trim() ?? "";
  if (!raw || raw.length !== TOKEN_HEX_LEN || !/^[0-9a-f]+$/i.test(raw)) {
    return Response.json({ error: "Invalid token." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  const tokenHash = createHash("sha256").update(raw, "utf8").digest("hex");
  const admin = createClient(supabaseUrl, serviceKey);

  const { data, error } = await admin
    .from("project_invites")
    .select("email")
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error("invites/preview", error.message);
    return Response.json({ error: "Lookup failed." }, { status: 500 });
  }
  if (!data?.email || typeof data.email !== "string") {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  return Response.json({ email: data.email.trim().toLowerCase() }, { headers: { "Cache-Control": "no-store" } });
}
