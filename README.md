# RenoTasker

[RenoTasker](https://renotasker.com) is a [Next.js](https://nextjs.org) app for renovation planning, budgets, and documents (bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app)).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

Productie-deploy loopt via de **Vercel Git-integratie** met deze GitHub-repo: commits op de gekoppelde branch (meestal `main`) triggeren build en deploy op Vercel. Er staat (voorlopig) geen aparte GitHub Action in dit project. Zie [Next.js deployment](https://nextjs.org/docs/app/building-your-application/deploying) voor algemene opties.

**Productiedomein (renotasker.com)**

- Vercel: koppel **renotasker.com** en **www.renotasker.com**; kies één canonieke host (apex of `www`) en zet in Vercel een redirect naar de andere. Vercel levert **HTTPS** automatisch; gebruik in productie geen `http://` in env-vars.

**`NEXT_PUBLIC_SITE_URL` staat niet automatisch in Vercel** — die variabele moet je zelf eenmalig toevoegen (hij staat niet in een standaardlijst):

1. [Vercel Dashboard](https://vercel.com) → jouw **project** → **Settings** → **Environment Variables**.
2. **Add New** (of **Add**):
   - **Key:** `NEXT_PUBLIC_SITE_URL`
   - **Value:** `https://www.renotasker.com` (of je echte canonieke URL, zonder slash aan het eind)
   - **Environment:** vink **Production** aan (en eventueel Preview als je daar dezelfde URL wilt).
3. **Save**, daarna **Deployments** → open de laatste deployment → **⋯** → **Redeploy** (omdat `NEXT_PUBLIC_*` bij de **build** wordt ingevoegd).

Zonder deze variabele vallen de app terug op `VERCEL_URL` voor metadata; uitnodigingslinks en canonieke Open Graph-URL’s zijn dan betrouwbaarder met een expliciete waarde die overeenkomt met je domein (www vs apex).
- Supabase Auth: **Site URL** en **Redirect URLs** moeten dezelfde HTTPS-host(s) bevatten (bijv. `https://www.renotasker.com/**` en `https://renotasker.com/**` als beide actief zijn), plus preview-URLs voor staging.
- Brevo: verifieer het afzenderdomein in het Brevo-dashboard voor uitgaande mail; gebruik een afzender zoals `uitnodigingen@renotasker.com` in de Edge secret `INVITE_EMAIL_FROM`.
- Op **Vercel Production** stuurt deze app een **HSTS**-header (`Strict-Transport-Security`), zodat browsers na een eerste bezoek over HTTPS voorkeur geven aan HTTPS voor dit domein.

### "Niet beveiligd" in Chrome (Nederlands)

1. **Adresbalk:** Controleer of de URL begint met **`https://`**. Begin je met **`http://`**, dan toont Chrome "Niet beveiligd" — ook als er elders een geldig certificaat is. Gebruik bookmarks en gedeelde links altijd met **`https://`**.
2. **Vercel → Settings → Domains:** Zorg dat `renotasker.com` en `www.renotasker.com` zijn toegevoegd en de status **Valid** is (DNS A/CNAME volgens Vercel). Wacht tot SSL is uitgegeven.
3. **Canonieke host:** Stel in Vercel een redirect in van secundair domein naar primair (bijv. apex → `www`). Zet **`NEXT_PUBLIC_SITE_URL`** in Vercel Production exact op die HTTPS-URL (zie `.env.example`).
4. **Nog steeds een waarschuwing op `https://`?** Open DevTools (F12) → **Console** / **Security** en zoek naar **mixed content** (resources via `http://`). Lokaal blijft `http://localhost` normaal en ongewijzigd.

## AI (OpenAI)

Serverroutes gebruiken `OPENAI_API_KEY`. Optioneel: **`OPENAI_MODEL`** — standaard is `gpt-4o-mini` (goedkoper/sneller); voor zwaardere redeneer-taken (chat, offertesamenvatting, offertevergelijking) kun je bijvoorbeeld `gpt-4o` zetten voor merkbaar betere kwaliteit tegen hogere kosten en latency. Output- en invoerformaten zijn begrensd via omgevingsvariabelen zoals `OPENAI_MAX_OUTPUT_TOKENS` en `OPENAI_COMPARE_PDF_MAX_CHARS_PER_DOC`; zie `.env.example` voor alle opties en uitleg.

## Projectuitnodigingen en e-mail

Uitnodigingslinks gebruiken `NEXT_PUBLIC_SITE_URL` (of de request-origin) als basis-URL. **Laat deze exact overeenkomen met de host waar gebruikers inloggen** (zelfde scheme + hostname, bijv. `https://www.…` als dat je primaire URL is). Anders raken uitnodigingslinks en sessiecookies op verschillende hosts en faalt accepteren met 401. Automatische uitnodigingsmail gaat via een **Supabase Edge Function** (`send-project-invite`) die **[Brevo](https://www.brevo.com/)** aanroept. Op **Vercel** heb je `NEXT_PUBLIC_SUPABASE_URL`, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** (voor de gateway) en **`INVITE_EDGE_SECRET`** (zelfde als in Supabase Edge secrets; wordt als `x-invite-secret` meegestuurd). De **Brevo API key** en het afzenderadres (`INVITE_EMAIL_FROM`) staan alleen als **secrets** bij de Edge Function, niet in Vercel. Zonder deze variabelen wordt geen mail verstuurd; de eigenaar ziet dan nog wel de link op het project om handmatig te delen.

Deploy de functie na wijzigingen: `npx supabase functions deploy send-project-invite` (met gelinkt project). Zie `.env.example` voor de volledige checklist.

Voor het **voorinvullen van het uitgenodigde e-mailadres** op inlog/registratie gebruikt de app `GET /api/invites/preview` (alleen met geldige token). Die route vereist **`SUPABASE_SERVICE_ROLE_KEY`** op Vercel (server-only; staat vaak al voor andere serverroutes).

De uitnodigingsmail gebruikt een **Brevo transactional template** (`BREVO_INVITE_TEMPLATE_ID`, standaard **7** als de secret ontbreekt). In Brevo moet die template het **New Template Language**-formaat gebruiken en placeholders voor deze API-`params`:

| Param | Inhoud |
|--------|--------|
| `inviteUrl` | Volledige URL naar `/invite/accept?token=…` (knop/link; Brevo kan click-tracking toevoegen) |
| `inviteUrlPlain` | Zelfde URL als platte tekst — gebruik in de mail als **kopieerbare fallback** als tracking of een in-app browser problemen geeft |
| `expiresAtIso` | Vervaldatum/tijd (ISO-string, UTC) |
| `projectName` | Projectnaam of lege string |

In de template-editor bijvoorbeeld: `{{ params.inviteUrl }}`, `{{ params.inviteUrlPlain }}`, `{{ params.expiresAtIso }}`, `{{ params.projectName }}`.

De e-mailtemplates onder **Supabase → Authentication → Emails** (bijv. «Invite user») worden door deze app **niet** gebruikt voor projectuitnodigingen — alleen de Edge Function + Brevo.

## Documenten (Supabase Storage)

Offertes en bijlagen gebruiken de bucket **`documents`**. Die moet **privé** blijven (`public = false`); anders zijn bestanden via een geraden URL mogelijk bereikbaar zonder inloggen. Voer de migraties uit (`supabase db push` of SQL Editor) en controleer in het Supabase-dashboard onder Storage dat de bucket niet publiek is. Toegang tot bestanden en metadata loopt via Row Level Security: alleen de projecteigenaar en een geaccepteerde medewerker op dat project.
