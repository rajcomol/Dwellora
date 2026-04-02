import { clientIpFromRequest, RATE_LIMIT, rateLimitResponse } from "@/lib/api/rateLimit";
import { createUserSupabaseFromRequest } from "@/lib/supabase/api-auth";
import { isUuid } from "@/lib/supabase/project-access";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const ip = clientIpFromRequest(req);
  const rl = rateLimitResponse(
    `collaboration:get:${ip}`,
    RATE_LIMIT.collaborationGet.limit,
    RATE_LIMIT.collaborationGet.windowMs,
    { scope: "collaboration:get", clientIp: ip }
  );
  if (rl) return rl;

  const auth = await createUserSupabaseFromRequest(req);
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

  if (projRes.error) {
    return Response.json({ error: projRes.error.message }, { status: 500 });
  }
  if (!projRes.data) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  const ownerId = String(projRes.data.user_id);
  const isOwner = ownerId === auth.userId;

  const memberRes = await auth.client
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .maybeSingle();

  const collaboratorUserId = memberRes.data?.user_id ? String(memberRes.data.user_id) : null;

  let pendingInvite: { email: string; expiresAt: string } | null = null;
  if (isOwner) {
    const invRes = await auth.client
      .from("project_invites")
      .select("email,expires_at")
      .eq("project_id", projectId)
      .eq("status", "pending")
      .maybeSingle();
    if (invRes.data?.email) {
      pendingInvite = {
        email: String(invRes.data.email),
        expiresAt: String(invRes.data.expires_at ?? ""),
      };
    }
  }

  return Response.json({
    isOwner,
    ownerUserId: ownerId,
    collaboratorUserId,
    pendingInvite,
  });
}
