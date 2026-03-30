import { createHash, randomBytes } from "node:crypto";
import { clientIpFromRequest, rateLimitResponse } from "@/lib/api/rateLimit";
import { createUserSupabaseFromRequest } from "@/lib/supabase/api-auth";
import { getPublicSiteUrlServer } from "@/lib/site-url";
import { isUuid } from "@/lib/supabase/project-access";
import { jsonValidationError, readJsonUnknown } from "@/lib/validation/http";
import { projectInviteEmailBodySchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

const INVITE_DAYS = 7;

export async function POST(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const rl = rateLimitResponse(`invites:post:${clientIpFromRequest(req)}`, 20, 60_000);
  if (rl) return rl;

  const auth = await createUserSupabaseFromRequest(req);
  if (!auth) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { projectId } = await context.params;
  if (!isUuid(projectId)) {
    return Response.json({ error: "Invalid project id." }, { status: 400 });
  }

  const raw = await readJsonUnknown(req);
  const parsed = projectInviteEmailBodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const email = parsed.data.email;
  const ownerEmail = auth.email?.trim().toLowerCase() ?? "";
  if (ownerEmail && email === ownerEmail) {
    return Response.json({ error: "You cannot invite your own email address." }, { status: 400 });
  }

  const projRes = await auth.client
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projRes.error) {
    return Response.json({ error: projRes.error.message }, { status: 500 });
  }
  if (!projRes.data || String(projRes.data.user_id) !== auth.userId) {
    return Response.json({ error: "Only the project owner can send invites." }, { status: 403 });
  }

  const memRes = await auth.client
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (memRes.data) {
    return Response.json({ error: "This project already has a collaborator." }, { status: 409 });
  }

  const pendingRes = await auth.client
    .from("project_invites")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingRes.data) {
    return Response.json({ error: "A pending invite already exists for this project." }, { status: 409 });
  }

  const plainToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(plainToken).digest("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_DAYS);

  const ins = await auth.client.from("project_invites").insert({
    project_id: projectId,
    email,
    token_hash: tokenHash,
    invited_by: auth.userId,
    status: "pending",
    expires_at: expiresAt.toISOString(),
  });

  if (ins.error) {
    console.error("project_invites insert", ins.error.message);
    return Response.json({ error: ins.error.message }, { status: 500 });
  }

  const site = getPublicSiteUrlServer();
  const base = site || new URL(req.url).origin;
  const inviteUrl = `${base.replace(/\/$/, "")}/invite/accept?token=${encodeURIComponent(plainToken)}`;

  return Response.json({
    inviteUrl,
    expiresAt: expiresAt.toISOString(),
  });
}

/** Owner cancels the pending invite for this project. */
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const auth = await createUserSupabaseFromRequest(_req);
  if (!auth) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { projectId } = await context.params;
  if (!isUuid(projectId)) {
    return Response.json({ error: "Invalid project id." }, { status: 400 });
  }

  const projRes = await auth.client
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!projRes.data || String(projRes.data.user_id) !== auth.userId) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const upd = await auth.client
    .from("project_invites")
    .update({ status: "cancelled" })
    .eq("project_id", projectId)
    .eq("status", "pending");

  if (upd.error) {
    return Response.json({ error: upd.error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
