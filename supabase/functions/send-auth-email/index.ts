import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import {
  brandAssetUrls,
  parseEmailFrom,
  resolveTemplateId,
  sendBrevoTemplate,
} from "../_shared/brevo.ts";

type EmailData = {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  token_new: string;
  token_hash_new: string;
  old_email?: string;
  old_phone?: string;
};

type HookUser = {
  email: string;
  new_email?: string;
};

type HookPayload = {
  user: HookUser;
  email_data: EmailData;
};

type MailCopy = {
  headline: string;
  subheadline: string;
  bodyText: string;
  bodyTextSecondary: string;
  actionLabel: string;
  showButton: string;
  otpHint: string;
};

const NOTIFICATION_TYPES = new Set([
  "password_changed_notification",
  "email_changed_notification",
  "phone_changed_notification",
  "identity_linked_notification",
  "identity_unlinked_notification",
  "mfa_factor_enrolled_notification",
  "mfa_factor_unenrolled_notification",
]);

function buildVerifyUrl(supabaseUrl: string, emailData: EmailData): string {
  const base = supabaseUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    token: emailData.token_hash,
    type: emailData.email_action_type,
    redirect_to: emailData.redirect_to,
  });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

function copyForAction(action: string, siteUrl: string): MailCopy {
  const site = siteUrl.replace(/\/$/, "") || "https://www.renotasker.com";
  switch (action) {
    case "signup":
      return {
        headline: "Bevestig je e-mailadres",
        subheadline: "Account aanmaken bij RenoTasker",
        bodyText:
          "Volg de link hieronder om je e-mailadres te bevestigen en je registratie af te ronden.",
        bodyTextSecondary: "",
        actionLabel: "E-mailadres bevestigen",
        showButton: "yes",
        otpHint: "",
      };
    case "recovery":
      return {
        headline: "Wachtwoord resetten",
        subheadline: "RenoTasker account",
        bodyText: "Je hebt een verzoek gedaan om je wachtwoord te resetten.",
        bodyTextSecondary: "Volg de link om een nieuw wachtwoord in te stellen.",
        actionLabel: "Wachtwoord resetten",
        showButton: "yes",
        otpHint: "",
      };
    case "magiclink":
      return {
        headline: "Inloggen bij RenoTasker",
        subheadline: "Directe inloglink",
        bodyText: "Gebruik de link hieronder om in te loggen.",
        bodyTextSecondary: "",
        actionLabel: "Inloggen",
        showButton: "yes",
        otpHint: "",
      };
    case "invite":
      return {
        headline: "Uitnodiging",
        subheadline: "RenoTasker",
        bodyText: "Je bent uitgenodigd. Volg de link om verder te gaan.",
        bodyTextSecondary: "",
        actionLabel: "Uitnodiging accepteren",
        showButton: "yes",
        otpHint: "",
      };
    case "email_change":
      return {
        headline: "Bevestig e-mailwijziging",
        subheadline: "RenoTasker account",
        bodyText: "Bevestig de wijziging van je e-mailadres via de link hieronder.",
        bodyTextSecondary: "",
        actionLabel: "E-mail bevestigen",
        showButton: "yes",
        otpHint: "",
      };
    case "email":
      return {
        headline: "Bevestig je e-mailadres",
        subheadline: "RenoTasker",
        bodyText: "Bevestig je e-mailadres via de link hieronder.",
        bodyTextSecondary: "",
        actionLabel: "E-mail bevestigen",
        showButton: "yes",
        otpHint: "",
      };
    case "reauthentication":
      return {
        headline: "Bevestig opnieuw inloggen",
        subheadline: "Beveiligingscontrole",
        bodyText: "Bevestig je identiteit om verder te gaan.",
        bodyTextSecondary: "",
        actionLabel: "Doorgaan",
        showButton: "yes",
        otpHint: "",
      };
    case "password_changed_notification":
      return {
        headline: "Wachtwoord gewijzigd",
        subheadline: "RenoTasker",
        bodyText: "Het wachtwoord van je account is zojuist gewijzigd.",
        bodyTextSecondary: "Was jij dit niet? Neem dan direct contact op.",
        actionLabel: "Naar RenoTasker",
        showButton: "yes",
        otpHint: "",
      };
    case "email_changed_notification":
      return {
        headline: "E-mailadres gewijzigd",
        subheadline: "RenoTasker",
        bodyText: "Het e-mailadres van je account is gewijzigd.",
        bodyTextSecondary: "",
        actionLabel: "Naar RenoTasker",
        showButton: "yes",
        otpHint: "",
      };
    case "phone_changed_notification":
      return {
        headline: "Telefoonnummer gewijzigd",
        subheadline: "RenoTasker",
        bodyText: "Het telefoonnummer van je account is gewijzigd.",
        bodyTextSecondary: "",
        actionLabel: "Naar RenoTasker",
        showButton: "yes",
        otpHint: "",
      };
    case "identity_linked_notification":
      return {
        headline: "Account gekoppeld",
        subheadline: "RenoTasker",
        bodyText: "Er is een nieuwe inlogmethode aan je account gekoppeld.",
        bodyTextSecondary: "",
        actionLabel: "Naar RenoTasker",
        showButton: "yes",
        otpHint: "",
      };
    case "identity_unlinked_notification":
      return {
        headline: "Account ontkoppeld",
        subheadline: "RenoTasker",
        bodyText: "Een inlogmethode is van je account verwijderd.",
        bodyTextSecondary: "",
        actionLabel: "Naar RenoTasker",
        showButton: "yes",
        otpHint: "",
      };
    case "mfa_factor_enrolled_notification":
      return {
        headline: "Extra beveiliging ingeschakeld",
        subheadline: "RenoTasker",
        bodyText: "Er is een nieuwe MFA-factor toegevoegd aan je account.",
        bodyTextSecondary: "",
        actionLabel: "Naar RenoTasker",
        showButton: "yes",
        otpHint: "",
      };
    case "mfa_factor_unenrolled_notification":
      return {
        headline: "Extra beveiliging uitgeschakeld",
        subheadline: "RenoTasker",
        bodyText: "Een MFA-factor is verwijderd van je account.",
        bodyTextSecondary: "",
        actionLabel: "Naar RenoTasker",
        showButton: "yes",
        otpHint: "",
      };
    default:
      return {
        headline: "Bericht van RenoTasker",
        subheadline: "",
        bodyText: "Er is een actie uitgevoerd op je account.",
        bodyTextSecondary: "",
        actionLabel: "Naar RenoTasker",
        showButton: "yes",
        otpHint: "",
      };
  }
}

function templateParams(
  copy: MailCopy,
  actionUrl: string,
  otpCode: string
): Record<string, string> {
  const assets = brandAssetUrls();
  const useOtp =
    otpCode && otpCode.length >= 4 && otpCode.length <= 8
      ? `Of gebruik deze code: ${otpCode}`
      : "";

  return {
    headline: copy.headline,
    subheadline: copy.subheadline,
    bodyText: copy.bodyText,
    bodyTextSecondary: copy.bodyTextSecondary || " ",
    actionLabel: copy.actionLabel,
    actionUrl,
    actionUrlPlain: actionUrl,
    showButton: copy.showButton,
    otpHint: copy.otpHint || useOtp,
    logoUrl: assets.logoUrl,
    instagramUrl: assets.instagramUrl,
    instagramLink: "https://www.instagram.com/reno.tasker?igsh=bzF2bDBmYTJ3MG1y",
  };
}

async function sendAuthMail(
  brevoKey: string,
  templateId: number,
  to: string,
  params: Record<string, string>,
  fromRaw: string | undefined
): Promise<Response | null> {
  let sender;
  if (fromRaw) {
    try {
      sender = parseEmailFrom(fromRaw);
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
    to,
    params,
    sender,
  });

  if (!result.ok) {
    console.error("Brevo auth email failed", result.status, result.error);
    return new Response(JSON.stringify({ error: result.error }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const hookSecretRaw = Deno.env.get("SEND_EMAIL_HOOK_SECRET")?.trim();
  const brevoKey = Deno.env.get("BREVO_API_KEY")?.trim();
  const fromRaw = Deno.env.get("AUTH_EMAIL_FROM")?.trim() || Deno.env.get("INVITE_EMAIL_FROM")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();

  if (!hookSecretRaw || !brevoKey || !supabaseUrl) {
    console.error("send-auth-email: missing SEND_EMAIL_HOOK_SECRET, BREVO_API_KEY, or SUPABASE_URL");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const templateId = resolveTemplateId("BREVO_AUTH_TEMPLATE_ID", 8);
  if (templateId === null) {
    console.error("send-auth-email: invalid BREVO_AUTH_TEMPLATE_ID");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const hookSecret = hookSecretRaw.replace(/^v1,whsec_/, "");
  const payloadText = await req.text();
  const headers = Object.fromEntries(req.headers);

  let payload: HookPayload;
  try {
    const wh = new Webhook(hookSecret);
    payload = wh.verify(payloadText, headers) as HookPayload;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("send-auth-email: webhook verify failed", msg);
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { user, email_data: emailData } = payload;
  const action = emailData.email_action_type;

  if (action === "email_change" && user.new_email && emailData.token_hash_new) {
    const copyCurrent = copyForAction("email_change", emailData.site_url);
    const urlCurrent = buildVerifyUrl(supabaseUrl, {
      ...emailData,
      token_hash: emailData.token_hash_new,
    });
    const err1 = await sendAuthMail(
      brevoKey,
      templateId,
      user.email,
      templateParams(copyCurrent, urlCurrent, emailData.token),
      fromRaw
    );
    if (err1) return err1;

    const copyNew = {
      ...copyForAction("email_change", emailData.site_url),
      headline: "Bevestig je nieuwe e-mailadres",
      bodyText: "Bevestig je nieuwe e-mailadres via de link hieronder.",
    };
    const urlNew = buildVerifyUrl(supabaseUrl, emailData);
    const err2 = await sendAuthMail(
      brevoKey,
      templateId,
      user.new_email,
      templateParams(copyNew, urlNew, emailData.token_new || emailData.token),
      fromRaw
    );
    if (err2) return err2;

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const copy = copyForAction(action, emailData.site_url);
  const actionUrl = NOTIFICATION_TYPES.has(action)
    ? emailData.site_url || "https://www.renotasker.com"
    : buildVerifyUrl(supabaseUrl, emailData);

  const err = await sendAuthMail(
    brevoKey,
    templateId,
    user.email,
    templateParams(copy, actionUrl, emailData.token),
    fromRaw
  );
  if (err) return err;

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
