# Brevo e-mailtemplates — RenoTasker (donkere huisstijl)

Plak deze HTML in Brevo onder **Transactional → Templates → New Template Language**.

## Branding-assets

Standaard (PROD public bucket):

- Logo: `https://qvansiwlykvhgfdygisu.supabase.co/storage/v1/object/public/Branding/renotasker-logo-new.png`
- Instagram: `https://qvansiwlykvhgfdygisu.supabase.co/storage/v1/object/public/Branding/instagram-icon-png-simple.png`

Edge Functions kunnen overschrijven via secrets:

- `BREVO_BRAND_BASE_URL` — bijv. `https://cgvmclxglxhbuhuovedl.supabase.co/storage/v1/object/public/Branding` (Staging)
- `BREVO_BRAND_LOGO_URL` / `BREVO_BRAND_INSTAGRAM_URL` — volledige URL’s

Het **logo** staat vast in de HTML (PROD storage-URL hieronder). Instagram gebruikt `{{ params.instagramUrl }}` (door Edge ingevuld).

## Template-ID’s (secrets)

| Template | Secret | Default |
|----------|--------|---------|
| Projectuitnodiging | `BREVO_INVITE_TEMPLATE_ID` | **7** |
| Auth (signup, recovery, …) | `BREVO_AUTH_TEMPLATE_ID` | **8** |

---

## Template 7 — Projectuitnodiging

**Params** (door [`send-project-invite`](../supabase/functions/send-project-invite/index.ts)):

| Param | Beschrijving |
|-------|----------------|
| `inviteUrl` | CTA-link |
| `inviteUrlPlain` | Fallback platte URL |
| `projectLine` | `Project: …` of leeg |
| `expiresLine` | `Geldig tot: …` (NL datum) |
| `instagramUrl` | Instagram-icoon |
| `instagramLink` | Instagram-profiel URL |

Plak in Brevo (template ID **7**):

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Uitnodiging RenoTasker</title>
</head>
<body style="margin:0; padding:0; background-color:#0b1120; font-family:Arial, Helvetica, sans-serif; color:#ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; margin:0; padding:0; background-color:#0b1120;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:600px; background-color:#10192b; border:1px solid #1e2a44; border-radius:18px;">
          <tr>
            <td align="center" style="padding:36px 24px 24px 24px;">
              <img
                src="https://qvansiwlykvhgfdygisu.supabase.co/storage/v1/object/public/Branding/renotasker-logo-new.png"
                alt="RenoTasker"
                width="240"
                style="display:block; width:100%; max-width:240px; height:auto; margin:0 auto 20px auto; border:0;"
              >
              <div style="font-size:24px; line-height:32px; font-weight:700; color:#ffffff; margin:0;">Je bent uitgenodigd</div>
              <div style="font-size:15px; line-height:22px; color:#9fb0d0; margin-top:6px;">Samen werken aan een verbouwing</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#ffffff;">Je bent uitgenodigd om deel te nemen aan een project in RenoTasker.</p>
              <p style="margin:0 0 8px 0; font-size:16px; line-height:26px; color:#cbd5e1;">{{ params.projectLine }}</p>
              <p style="margin:0 0 24px 0; font-size:16px; line-height:26px; color:#cbd5e1;">Accepteer de uitnodiging om toegang te krijgen tot het project en direct samen te werken aan taken, planning en voortgang.</p>
              <p style="margin:0 0 16px 0; font-size:14px; line-height:22px; color:#94a3b8;">{{ params.expiresLine }}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px 0;">
                <tr>
                  <td align="center" bgcolor="#f4b400" style="border-radius:12px;">
                    <a href="{{ params.inviteUrl }}" target="_blank" style="display:inline-block; padding:14px 26px; font-size:16px; line-height:20px; font-weight:700; color:#111827; text-decoration:none; border-radius:12px;">Accepteer de uitnodiging</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 10px 0; font-size:14px; line-height:22px; color:#94a3b8;">Werkt de knop niet? Gebruik dan deze link:</p>
              <p style="margin:0 0 28px 0; font-size:14px; line-height:22px; word-break:break-word;">
                <a href="{{ params.inviteUrlPlain }}" target="_blank" style="color:#38bdf8; text-decoration:underline;">{{ params.inviteUrlPlain }}</a>
              </p>
              <p style="margin:0; font-size:14px; line-height:22px; color:#94a3b8;">Verwachtte je deze uitnodiging niet? Dan kun je deze e-mail negeren.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px; border-top:1px solid #1e2a44; background-color:#0f172a;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:12px; line-height:18px; color:#94a3b8;">© 2026 RenoTasker</td>
                  <td align="right">
                    <a href="{{ params.instagramLink }}" target="_blank" style="text-decoration:none;">
                      <img src="{{ params.instagramUrl }}" alt="Instagram" width="24" height="24" style="display:block; border:0;">
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Template 8 — Auth (signup, recovery, magic link, …)

**Params** (door [`send-auth-email`](../supabase/functions/send-auth-email/index.ts)):

| Param | Beschrijving |
|-------|----------------|
| `headline` | Hoofdkop |
| `subheadline` | Subkop (kan leeg) |
| `bodyText` | Hoofdtekst |
| `bodyTextSecondary` | Extra alinea (leeg = geen zichtbare regel als je alleen spaties stuurt) |
| `actionLabel` | Knoptekst |
| `actionUrl` | Verify- of site-URL |
| `actionUrlPlain` | Fallback-link |
| `otpHint` | Optioneel: `Of gebruik deze code: 123456` |
| `showButton` | `yes` (toon CTA-knop) |
| `instagramUrl`, `instagramLink` | Branding |

Plak in Brevo (template ID **8**):

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>{{ params.headline }}</title>
</head>
<body style="margin:0; padding:0; background-color:#0b1120; font-family:Arial, Helvetica, sans-serif; color:#ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; margin:0; padding:0; background-color:#0b1120;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:600px; background-color:#10192b; border:1px solid #1e2a44; border-radius:18px;">
          <tr>
            <td align="center" style="padding:36px 24px 24px 24px;">
              <img
                src="https://qvansiwlykvhgfdygisu.supabase.co/storage/v1/object/public/Branding/renotasker-logo-new.png"
                alt="RenoTasker"
                width="240"
                style="display:block; width:100%; max-width:240px; height:auto; margin:0 auto 20px auto; border:0;"
              >
              <div style="font-size:24px; line-height:32px; font-weight:700; color:#ffffff; margin:0;">{{ params.headline }}</div>
              <div style="font-size:15px; line-height:22px; color:#9fb0d0; margin-top:6px;">{{ params.subheadline }}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#ffffff;">{{ params.bodyText }}</p>
              <p style="margin:0 0 24px 0; font-size:16px; line-height:26px; color:#cbd5e1;">{{ params.bodyTextSecondary }}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px 0;">
                <tr>
                  <td align="center" bgcolor="#f4b400" style="border-radius:12px;">
                    <a href="{{ params.actionUrl }}" target="_blank" style="display:inline-block; padding:14px 26px; font-size:16px; line-height:20px; font-weight:700; color:#111827; text-decoration:none; border-radius:12px;">{{ params.actionLabel }}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 10px 0; font-size:14px; line-height:22px; color:#94a3b8;">{{ params.otpHint }}</p>
              <p style="margin:0 0 10px 0; font-size:14px; line-height:22px; color:#94a3b8;">Werkt de knop niet? Gebruik dan deze link:</p>
              <p style="margin:0 0 28px 0; font-size:14px; line-height:22px; word-break:break-word;">
                <a href="{{ params.actionUrlPlain }}" target="_blank" style="color:#38bdf8; text-decoration:underline;">{{ params.actionUrlPlain }}</a>
              </p>
              <p style="margin:0; font-size:14px; line-height:22px; color:#94a3b8;">Verwachtte je deze e-mail niet? Dan kun je deze e-mail negeren.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px; border-top:1px solid #1e2a44; background-color:#0f172a;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:12px; line-height:18px; color:#94a3b8;">© 2026 RenoTasker</td>
                  <td align="right">
                    <a href="{{ params.instagramLink }}" target="_blank" style="text-decoration:none;">
                      <img src="{{ params.instagramUrl }}" alt="Instagram" width="24" height="24" style="display:block; border:0;">
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Supabase Send Email Hook

1. Deploy `send-auth-email` (zie [`docs/SUPABASE_ENVIRONMENT.md`](SUPABASE_ENVIRONMENT.md)).
2. Dashboard → **Authentication → Hooks → Send Email** → URL:  
   `https://<project-ref>.supabase.co/functions/v1/send-auth-email`
3. Kopieer hook secret → Edge secret `SEND_EMAIL_HOOK_SECRET` (formaat `v1,whsec_…`).
4. Zet **BREVO_API_KEY**, `BREVO_AUTH_TEMPLATE_ID`, optioneel `AUTH_EMAIL_FROM`.
5. Brevo: **API IP-restrictie uit** voor serverless.

Zie ook [`docs/EDGE_INVITE_JWT.md`](EDGE_INVITE_JWT.md) en [`docs/VERCEL_ENV_CHECKLIST.md`](VERCEL_ENV_CHECKLIST.md).

---

## Checklist na implementatie

1. Brevo: HTML template **7** en **8** plakken (bovenstaand).
2. `npm run supabase:functions:deploy-email:staging` en `:prod` (of Dashboard bij EPERM).
3. Edge secrets per project: `BREVO_API_KEY`, hook secret, template-ID’s, afzender.
4. Auth Hook URL + secret (Staging eerst testen).
5. Staging: `Branding`-bucket vullen of `BREVO_BRAND_BASE_URL` zetten.
6. `npm run probe:edge` → beide functies ≠ 404; `npm run verify:invite` → OK.
