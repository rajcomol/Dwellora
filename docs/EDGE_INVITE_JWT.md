# Invite Edge Function: 401 / Invalid JWT

## Symptoom

- `UNAUTHORIZED_INVALID_JWT_FORMAT` — `sb_publishable_` / `sb_secret_` in `Authorization: Bearer` (geen JWT).
- `UNAUTHORIZED_NO_AUTH_HEADER` — gateway verwacht auth; functie heeft vaak nog **JWT verification** aan.

## Oplossing (per Supabase-project: Staging + PROD)

1. Dashboard → **Edge Functions** → **`send-project-invite`**
2. Zet **Enforce JWT Verification** (of vergelijkbaar) **UIT** / `verify_jwt = false`
3. **Deploy** de functie opnieuw (Dashboard of CLI hieronder)

Repo-config staat al in `supabase/config.toml`:

```toml
[functions.send-project-invite]
verify_jwt = false
```

Remote moet na deploy gelijk lopen met deze config.

## CLI deploy (als EPERM weg is)

```bash
npm run supabase:functions:deploy-invite:staging
npm run supabase:functions:deploy-invite:prod
```

## App-gedrag (na fix)

- Gateway: `apikey` = `SUPABASE_SERVICE_ROLE_KEY` (server) of legacy JWT anon
- App-auth: header `x-invite-secret` = `INVITE_EDGE_SECRET` (zelfde als Edge secret)

Zet **`SUPABASE_SERVICE_ROLE_KEY`** op Vercel Production én Preview (per project de juiste key).

## Test

```bash
npm run verify:invite
```
