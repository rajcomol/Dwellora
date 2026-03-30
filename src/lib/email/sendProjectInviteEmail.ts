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
 * Sends a project collaboration invite via Resend (`RESEND_API_KEY`, `INVITE_EMAIL_FROM`).
 * If those env vars are missing, returns `{ ok: false, skipped: true }` without throwing.
 */
export async function sendProjectInviteEmail(
  params: SendProjectInviteEmailParams
): Promise<SendProjectInviteEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.INVITE_EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    return { ok: false, skipped: true };
  }

  const projectLinePlain =
    params.projectName && params.projectName.trim() !== ""
      ? `Project: ${params.projectName.trim()}`
      : "Je bent uitgenodigd om mee te werken aan een renovatieproject in Dwellora.";

  const projectLineHtml =
    params.projectName && params.projectName.trim() !== ""
      ? `Project: ${escapeHtml(params.projectName.trim())}`
      : "Je bent uitgenodigd om mee te werken aan een renovatieproject in Dwellora.";

  const text = [
    "Hallo,",
    "",
    projectLinePlain,
    "",
    "Open onderstaande link om de uitnodiging te accepteren (je moet inloggen of registreren met dit e-mailadres):",
    params.inviteUrl,
    "",
    `Deze link verloopt rond ${params.expiresAtIso} (UTC).`,
    "",
    "Als de knop niet werkt, kopieer de link en plak die in je browser.",
    "",
    "Groet,",
    "Het Dwellora-team",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="nl">
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1a1a1a;">
  <p>Hallo,</p>
  <p>${projectLineHtml}</p>
  <p>Open de onderstaande knop om de uitnodiging te accepteren. Je moet inloggen of registreren met <strong>ditzelfde e-mailadres</strong>.</p>
  <p><a href="${escapeHtmlAttr(params.inviteUrl)}" style="display: inline-block; padding: 12px 20px; background: #22d3ee; color: #0f172a; text-decoration: none; border-radius: 9999px; font-weight: 600;">Uitnodiging openen</a></p>
  <p style="font-size: 14px; color: #555;">Of kopieer deze link in je browser:<br /><span style="word-break: break-all;">${escapeHtml(params.inviteUrl)}</span></p>
  <p style="font-size: 13px; color: #666;">Deze link verloopt rond ${escapeHtml(params.expiresAtIso)} (UTC).</p>
</body>
</html>`.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: "Uitnodiging voor Dwellora — renovatieproject",
        text,
        html,
      }),
    });

    if (!res.ok) {
      const errBody = (await res.text().catch(() => "")) || res.statusText;
      console.error("Resend invite email failed", res.status, errBody);
      return { ok: false, error: errBody.slice(0, 200) };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Resend invite email exception", msg);
    return { ok: false, error: msg };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlAttr(s: string): string {
  return escapeHtml(s);
}
