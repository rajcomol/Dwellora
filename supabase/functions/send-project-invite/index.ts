import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Body = {
  to: string;
  inviteUrl: string;
  expiresAtIso: string;
  projectName?: string | null;
};

function parseSender(from: string): { name: string; email: string } {
  const trimmed = from.trim();
  const m = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) {
    return {
      name: m[1].replace(/^["']|["']$/g, "").trim(),
      email: m[2].trim(),
    };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { name: "RenoTasker", email: trimmed };
  }
  throw new Error("Invalid INVITE_EMAIL_FROM");
}

function resolveTemplateId(): number | null {
  const raw = Deno.env.get("BREVO_INVITE_TEMPLATE_ID")?.trim();
  if (raw === undefined || raw === "") {
    return 7;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return n;
}

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

  const templateId = resolveTemplateId();
  if (templateId === null) {
    console.error("send-project-invite: invalid BREVO_INVITE_TEMPLATE_ID");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const auth = req.headers.get("Authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (bearer !== secret) {
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

  const brevoPayload: Record<string, unknown> = {
    templateId,
    to: [{ email: body.to.trim() }],
    params: {
      inviteUrl: body.inviteUrl,
      expiresAtIso: body.expiresAtIso,
      projectName,
    },
  };

  if (fromRaw) {
    try {
      brevoPayload.sender = parseSender(fromRaw);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid sender configuration" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": brevoKey,
      },
      body: JSON.stringify(brevoPayload),
    });

    if (!res.ok) {
      const errBody = (await res.text().catch(() => "")) || res.statusText;
      console.error("Brevo invite email failed", res.status, errBody);
      return new Response(JSON.stringify({ error: errBody.slice(0, 300) }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Brevo invite email exception", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
