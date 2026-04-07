export type SendProjectInviteEmailParams = {
  to: string;
  inviteUrl: string;
  expiresAtIso: string;
  projectName?: string | null;
};

export type SendProjectInviteEmailResult =
  | { ok: true }
  | { ok: false; skipped: true }
  | { ok: false; skipped?: false; error: string };

/**
 * Sends a project collaboration invite via Supabase Edge Function `send-project-invite`,
 * which calls the Brevo API. Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `Authorization`/`apikey`
 * so the Supabase gateway accepts the request; `INVITE_EDGE_SECRET` is sent as `x-invite-secret`
 * for app-level auth (same value as Edge secret). If env is incomplete, returns skipped.
 */
export async function sendProjectInviteEmail(
  params: SendProjectInviteEmailParams
): Promise<SendProjectInviteEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const secret = process.env.INVITE_EDGE_SECRET?.trim();
  if (!baseUrl || !anonKey || !secret) {
    return { ok: false, skipped: true };
  }

  const url = `${baseUrl}/functions/v1/send-project-invite`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
        "Content-Type": "application/json",
        "x-invite-secret": secret,
      },
      body: JSON.stringify({
        to: params.to,
        inviteUrl: params.inviteUrl,
        expiresAtIso: params.expiresAtIso,
        projectName: params.projectName ?? null,
      }),
    });

    const raw = (await res.text().catch(() => "")) || res.statusText;
    if (!res.ok) {
      let err = raw.slice(0, 300);
      try {
        const j = JSON.parse(raw) as { error?: string };
        if (typeof j.error === "string" && j.error.length > 0) err = j.error.slice(0, 300);
      } catch {
        /* keep err */
      }
      console.error("Invite edge function failed", res.status, err);
      return { ok: false, error: err };
    }

    try {
      const j = JSON.parse(raw) as { ok?: boolean };
      if (j.ok === true) return { ok: true };
    } catch {
      /* fallthrough */
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Invite edge function exception", msg);
    return { ok: false, error: msg };
  }
}
