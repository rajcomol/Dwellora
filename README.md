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
- Omgevingsvariabele: `NEXT_PUBLIC_SITE_URL` op je canonieke URL, bijv. `https://www.renotasker.com` als dat je primaire adres is (moet overeenkomen met waar gebruikers landen).
- Supabase Auth: **Site URL** en **Redirect URLs** moeten dezelfde HTTPS-host(s) bevatten (bijv. `https://www.renotasker.com/**` en `https://renotasker.com/**` als beide actief zijn), plus preview-URLs voor staging.
- Resend (of vergelijkbaar): verifieer het domein **renotasker.com** voor uitgaande mail; gebruik een afzender zoals `uitnodigingen@renotasker.com` in `INVITE_EMAIL_FROM`.

## AI (OpenAI)

Serverroutes gebruiken `OPENAI_API_KEY`. Optioneel: **`OPENAI_MODEL`** — standaard is `gpt-4o-mini` (goedkoper/sneller); voor zwaardere redeneer-taken (chat, offertesamenvatting, offertevergelijking) kun je bijvoorbeeld `gpt-4o` zetten voor merkbaar betere kwaliteit tegen hogere kosten en latency. Output- en invoerformaten zijn begrensd via omgevingsvariabelen zoals `OPENAI_MAX_OUTPUT_TOKENS` en `OPENAI_COMPARE_PDF_MAX_CHARS_PER_DOC`; zie `.env.example` voor alle opties en uitleg.

## Projectuitnodigingen en e-mail

Uitnodigingslinks gebruiken `NEXT_PUBLIC_SITE_URL` (of de request-origin) als basis-URL; zet in productie een vaste canonieke site-URL. Automatische uitnodigingsmail gaat via **Resend**: `RESEND_API_KEY` en `INVITE_EMAIL_FROM` in Vercel / `.env.local`. Zonder die variabelen wordt geen mail verstuurd; de eigenaar ziet dan nog wel de link op het project om handmatig te delen.

## Documenten (Supabase Storage)

Offertes en bijlagen gebruiken de bucket **`documents`**. Die moet **privé** blijven (`public = false`); anders zijn bestanden via een geraden URL mogelijk bereikbaar zonder inloggen. Voer de migraties uit (`supabase db push` of SQL Editor) en controleer in het Supabase-dashboard onder Storage dat de bucket niet publiek is. Toegang tot bestanden en metadata loopt via Row Level Security: alleen de projecteigenaar en een geaccepteerde medewerker op dat project.
