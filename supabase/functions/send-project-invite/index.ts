import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  brandAssetUrls,
  formatExpiresNl,
  parseEmailFrom,
  resolveTemplateId,
  sendBrevoTemplate,
} from "../_shared/brevo.ts";

type Body = {
  to: string;
  inviteUrl: string;
  inviteUrlPlain?: string;
  expiresAtIso: string;
  projectName?: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const secret = Deno.env.get("INVITE_EDGE_SECRET")?.trim();
  const brevoKey = Deno.env.get("BREVO_API_KEY")?.trim();
  const fromRaw = Deno.env.get("INVITE_EMAIL_FROM")?.trim();

  if (!secret || !brevoKey) {
    console.error("send-project-invite: missing INVITE_EDGE_SECRET or BREVO_API_KEY");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const templateId = resolveTemplateId("BREVO_INVITE_TEMPLATE_ID", 7);
  if (templateId === null) {
    console.error("send-project-invite: invalid BREVO_INVITE_TEMPLATE_ID");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const inviteHeader = req.headers.get("x-invite-secret")?.trim();
  const auth = req.headers.get("Authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const authorized = inviteHeader === secret || bearer === secret;
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (
    typeof body.to !== "string" ||
    !body.to.includes("@") ||
    typeof body.inviteUrl !== "string" ||
    typeof body.expiresAtIso !== "string"
  ) {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const projectName =
    body.projectName && typeof body.projectName === "string" && body.projectName.trim() !== ""
      ? body.projectName.trim()
      : "";

  const invitePlain =
    typeof body.inviteUrlPlain === "string" && body.inviteUrlPlain.trim() !== ""
      ? body.inviteUrlPlain.trim()
      : body.inviteUrl;

  const assets = brandAssetUrls();
  const expiresNl = formatExpiresNl(body.expiresAtIso);
  const params: Record<string, string> = {
    inviteUrl: body.inviteUrl,
    inviteUrlPlain: invitePlain,
    expiresAtIso: expiresNl,
    projectName,
    projectLine: projectName ? `Project: ${projectName}` : "",
    expiresLine: `Geldig tot: ${expiresNl}`,
    logoUrl: assets.logoUrl,
    instagramUrl: assets.instagramUrl,
    instagramLink: "https://www.instagram.com/reno.tasker?igsh=bzF2bDBmYTJ3MG1y",
  };

  let sender;
  if (fromRaw) {
    try {
      sender = parseEmailFrom(fromRaw, "RenoTasker");
    } catch {
      return new Response(JSON.stringify({ error: "Invalid sender configuration" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const result = await sendBrevoTemplate({
    apiKey: brevoKey,
    templateId,
    to: body.to,
    params,
    sender,
  });

  if (!result.ok) {
    console.error("Brevo invite email failed", result.status, result.error);
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status >= 400 ? result.status : 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
