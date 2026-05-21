# Vercel environment checklist (handmatig in dashboard)

Gebruik **Settings → Environment Variables**. Na wijzigingen: **Redeploy Production**.

## Production (renotasker.com) → PROD Supabase

| Key | Waarde moet zijn |
|-----|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qvansiwlykvhgfdygisu.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key van project **qvansiwlykvhgfdygisu** |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key van **qvansiwlykvhgfdygisu** |
| `INVITE_EDGE_SECRET` | **Identiek** aan Supabase PROD → Edge → Secrets |
| `NEXT_PUBLIC_SITE_URL` | `https://www.renotasker.com` (of jouw canonieke URL) |

**Niet** de Staging-URL (`cgvmclxglxhbuhuovedl`) op Production — dan faalt invite-mail (Edge 404 op Staging).

## Preview + Development → Staging

| Key | Waarde |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cgvmclxglxhbuhuovedl.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging secret key |
| `INVITE_EDGE_SECRET` | Identiek aan **Staging** Edge secrets (mag ≠ PROD) |

## Supabase Edge (per project)

Dashboard → Edge Functions → **send-project-invite** → Secrets:

- `BREVO_API_KEY`
- `INVITE_EDGE_SECRET` (match Vercel voor datzelfde project)
- Optioneel: `BREVO_INVITE_TEMPLATE_ID`, `INVITE_EMAIL_FROM`

**Status (automatisch getest):**

- PROD: functie **aanwezig** (gateway reageert)
- Staging: functie **ontbreekt** tot deploy — `npm run supabase:functions:deploy-invite:staging` (of Dashboard upload)

## INVITE_EDGE_SECRET “Needs Attention”

1. Nieuwe lange secret genereren  
2. Vercel Production **en** Supabase PROD Edge bijwerken  
3. Variabele als **Sensitive** markeren  
4. Redeploy  

## Publishable keys (`sb_publishable_…`)

De Edge Function-gateway accepteert die **niet** als `Authorization: Bearer` (fout: `Invalid JWT`).
De app gebruikt `apikey` met `SUPABASE_SERVICE_ROLE_KEY` (of legacy JWT anon). Zet **service role** op Vercel per scope.

## Verificatie lokaal

```bash
# INVITE_EDGE_SECRET + SUPABASE_SERVICE_ROLE_KEY in .env.local (Staging)
npm run verify:invite
node scripts/probe-edge-functions.mjs
```
