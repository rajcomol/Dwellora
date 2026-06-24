# Supabase: Staging vs Production

## Project refs

| Omgeving | Naam | Reference ID | API URL |
|----------|------|--------------|---------|
| **Staging** (BUILD) | RenoTasker Staging | `cgvmclxglxhbuhuovedl` | `https://cgvmclxglxhbuhuovedl.supabase.co` |
| **Production** (PROD) | RenoTasker PROD | `qvansiwlykvhgfdygisu` | `https://qvansiwlykvhgfdygisu.supabase.co` |

## Database-discipline (BELANGRIJK)

Twee aparte Postgres-databases. De **Supabase CLI-link** bepaalt waar `db push` naartoe gaat — niet `.env.local`. Daardoor kunnen migraties op PROD landen terwijl de dev-server Staging gebruikt.

### Dagelijks (ontwikkeling)

1. CLI staat **altijd** gelinkt aan **Staging** (`cgvmclxglxhbuhuovedl`).
2. Vóór **elke** `db push`:
   ```bash
   npx supabase projects list
   ```
   Controleer dat de ● bij **RenoTasker Staging** staat — **niet** bij PROD.
3. Schema alleen wijzigen via **migration files** in `supabase/migrations/` + `npm run supabase:db:push`.
   **Nooit** ad hoc via SQL Editor of management API.
4. Poort **5432** moet bereikbaar zijn (CLI → Postgres). Geblokkeerd netwerk → mobiele hotspot.

### Release naar PROD (bewust ritueel)

Alleen wanneer migraties bewust naar productie moeten:

```bash
npx supabase link --project-ref qvansiwlykvhgfdygisu
npx supabase db push
npx supabase link --project-ref cgvmclxglxhbuhuovedl   # DIRECT terug naar Staging
npx supabase projects list                              # verifieer ● op Staging
```

Handige shortcuts: `npm run supabase:link:staging` en `npm run supabase:link:prod`.

### Incident juni 2026

CLI stond op PROD, app op Staging. Fixes (invite-digest, planner_generations) kwamen op de verkeerde DB terecht en leken lokaal “wel te werken maar dan toch niet”. Deze discipline voorkomt dat.

## Waar welke keys horen

| Plaats | Supabase | `INVITE_EDGE_SECRET` |
|--------|----------|----------------------|
| `.env.local` (lokaal) | **Staging** | Zelfde als Staging Edge secrets |
| Vercel **Production** | **PROD** | Zelfde als PROD Edge secrets |
| Vercel **Preview** + **Development** | **Staging** | Zelfde als Staging Edge secrets |

**Eén Git-repo, één Vercel-project.** Alleen environment variables scheiden de databases.

## Transactionele e-mail (Brevo)

HTML-templates en params: **`docs/BREVO_EMAIL_TEMPLATES.md`**.

| Flow | Brevo template | Edge Function |
|------|----------------|---------------|
| Projectuitnodiging | **7** | `send-project-invite` |
| Auth (signup, recovery, magic link, …) | **8** | `send-auth-email` (Send Email Hook) |

### Invite (template 7)

1. **Vercel** (per scope): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `INVITE_EDGE_SECRET`
2. **Supabase Edge secrets**: `BREVO_API_KEY`, `INVITE_EDGE_SECRET` (optioneel `BREVO_INVITE_TEMPLATE_ID`, `INVITE_EMAIL_FROM`)
3. Deploy: `npm run supabase:functions:deploy-invite:staging` en `:prod`
4. Brevo editor: plak HTML uit `docs/BREVO_EMAIL_TEMPLATES.md` → template **7**

### Auth (template 8 + Send Email Hook)

Per project (Staging + PROD):

1. **Dashboard** → Authentication → **Hooks** → **Send Email** → inschakelen  
   URL: `https://<ref>.supabase.co/functions/v1/send-auth-email`  
   Kopieer het hook-secret (`v1,whsec_…`) naar Edge secrets als `SEND_EMAIL_HOOK_SECRET`.
2. **Edge secrets** (naast `BREVO_API_KEY`):  
   `SEND_EMAIL_HOOK_SECRET`, `BREVO_AUTH_TEMPLATE_ID=8`, `AUTH_EMAIL_FROM`  
   Optioneel op Staging: `BREVO_BRAND_BASE_URL` (logo/Instagram uit Staging storage `Branding`).
3. Deploy: `npm run supabase:functions:deploy-auth-email:staging` en `:prod`  
   Of beide: `npm run supabase:functions:deploy-email:staging` / `:prod`
4. Brevo editor: plak HTML uit docs → template **8**
5. Brevo: **API key IP-restrictie uit** (serverless egress wisselt IP).

### Branding op Staging

Upload dezelfde bestanden als PROD naar bucket `Branding` op Staging, **of** zet `BREVO_BRAND_BASE_URL` naar de Staging public storage-URL (zie `.env.example`).

6. **Redeploy** Vercel Production na wijziging van env vars.

Zie ook **`docs/VERCEL_ENV_CHECKLIST.md`** (exacte Vercel-waarden per scope).

### Diagnose invite-mail op productie

Als Vercel Production per ongeluk de **Staging-URL** gebruikt, roept de app Staging Edge aan → daar was de functie **niet** gedeployed (HTTP 404) → geen mail, wel invite in DB.

Controle: `npm run probe:edge` — PROD moet ≠ 404, Staging deployen als je preview-mail wilt.

## Deploy Edge Functions

```bash
npm run supabase:functions:deploy-email:staging   # invite + auth op Staging
npm run supabase:functions:deploy-email:prod
npm run probe:edge                                # 401 = deployed, 404 = nog deployen
```

**Windows / OneDrive:** bij `spawnSync … supabase.exe EPERM` deploy vanaf een map buiten OneDrive, of via [Supabase Dashboard](https://supabase.com/dashboard) → Edge Functions → deploy vanuit linked project. Auth-functie moet op **beide** refs staan vóór je de Send Email Hook inschakelt.

## Verificatie

```bash
npm run verify:supabase      # schema + storage (.env.local)
npm run verify:invite        # Edge + INVITE_EDGE_SECRET (.env.local)
npm run probe:edge           # send-project-invite + send-auth-email bereikbaar
```

| Test | Verwacht |
|------|----------|
| `npm run verify:invite` | OK (geen 502) |
| Registratie (Staging) | Donkere Brevo-mail template 8, link → dashboard |
| Wachtwoord vergeten | Template 8, recovery-flow |
| Projectuitnodiging | Template 7, logo + gele knop |

## Vercel "Needs Attention" op secrets

Roteer `INVITE_EDGE_SECRET`: nieuwe waarde in Vercel **en** Supabase Edge secrets (zelfde project), markeer als **Sensitive**, redeploy.
