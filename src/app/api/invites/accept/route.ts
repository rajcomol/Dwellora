import { clientIpFromRequest, RATE_LIMIT, rateLimitResponse } from "@/lib/api/rateLimit";
import { createUserSupabaseFromRequest } from "@/lib/supabase/api-auth";
import { jsonValidationError, readJsonUnknown } from "@/lib/validation/http";
import { acceptProjectInviteBodySchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/** Set `INVITE_ACCEPT_AUTH_DEBUG=1` on Vercel temporarily to trace 401s (no cookie values or tokens logged). */
function logInviteAcceptAuthDebug(req: Request, reason: string) {
  if (process.env.INVITE_ACCEPT_AUTH_DEBUG !== "1") return;
  const authz = req.headers.get("authorization");
  const hasBearer = Boolean(authz?.startsWith("Bearer ") && authz.slice(7).trim().length > 0);
  const cookie = req.headers.get("cookie");
  const cookieLen = cookie?.length ?? 0;
  const cookieLooksLikeSupabase = typeof cookie === "string" && /\bsb-[^=]+=/.test(cookie);
  console.warn("[invites/accept auth debug]", reason, {
    hasAuthorizationBearer: hasBearer,
    cookieHeaderLength: cookieLen,
    cookieLooksLikeSupabaseSession: cookieLooksLikeSupabase,
    host: req.headers.get("host") ?? "",
  });
}

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  const rl = rateLimitResponse(`invites:accept:${ip}`, RATE_LIMIT.invitesAccept.limit, RATE_LIMIT.invitesAccept.windowMs, {
    scope: "invites:accept",
    clientIp: ip,
  });
  if (rl) return rl;

  const auth = await createUserSupabaseFromRequest(req);
  if (!auth) {
    logInviteAcceptAuthDebug(req, "createUserSupabaseFromRequest_null");
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const raw = await readJsonUnknown(req);
  const parsed = acceptProjectInviteBodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const { data, error } = await auth.client.rpc("accept_project_invite", {
    p_plain_token: parsed.data.token,
  });

  if (error) {
    console.error("accept_project_invite", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  const row = data as { ok?: boolean; error?: string; project_id?: string } | null;
  if (!row || typeof row !== "object") {
    return Response.json({ error: "Unexpected response." }, { status: 500 });
  }

  if (!row.ok) {
    const code = row.error ?? "unknown";
    const status =
      code === "email_mismatch"
        ? 403
        : code === "not_authenticated"
          ? 401
          : code === "already_has_member" || code === "owner_cannot_accept_own_invite"
            ? 409
            : 400;
    if (code === "not_authenticated") {
      logInviteAcceptAuthDebug(req, "rpc_not_authenticated");
    }
    return Response.json({ error: code }, { status });
  }

  return Response.json({ projectId: row.project_id });
}
