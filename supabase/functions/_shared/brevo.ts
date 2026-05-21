/** Shared Brevo transactional template sender for Edge Functions. */

export type BrevoSender = { name: string; email: string };

export function parseEmailFrom(from: string, defaultName = "RenoTasker"): BrevoSender {
  const trimmed = from.trim();
  const m = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) {
    return {
      name: m[1].replace(/^["']|["']$/g, "").trim(),
      email: m[2].trim(),
    };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { name: defaultName, email: trimmed };
  }
  throw new Error("Invalid sender configuration");
}

export function resolveTemplateId(envKey: string, defaultId: number): number | null {
  const raw = Deno.env.get(envKey)?.trim();
  if (raw === undefined || raw === "") {
    return defaultId;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return n;
}

export function brandAssetUrls(): { logoUrl: string; instagramUrl: string } {
  const base = Deno.env.get("BREVO_BRAND_BASE_URL")?.trim().replace(/\/$/, "");
  const defaultBase = "https://qvansiwlykvhgfdygisu.supabase.co/storage/v1/object/public/Branding";
  const root = base || defaultBase;
  const logo =
    Deno.env.get("BREVO_BRAND_LOGO_URL")?.trim() ||
    `${root}/renotasker-logo-new.png`;
  const instagram =
    Deno.env.get("BREVO_BRAND_INSTAGRAM_URL")?.trim() ||
    `${root}/instagram-icon-png-simple.png`;
  return { logoUrl: logo, instagramUrl: instagram };
}

export async function sendBrevoTemplate(options: {
  apiKey: string;
  templateId: number;
  to: string;
  params: Record<string, string>;
  sender?: BrevoSender;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const payload: Record<string, unknown> = {
    templateId: options.templateId,
    to: [{ email: options.to.trim() }],
    params: options.params,
  };
  if (options.sender) {
    payload.sender = options.sender;
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": options.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = (await res.text().catch(() => "")) || res.statusText;
      return { ok: false, status: res.status, error: errBody.slice(0, 300) };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 500, error: msg };
  }
}

export function formatExpiresNl(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("nl-NL", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Amsterdam",
    });
  } catch {
    return iso;
  }
}
