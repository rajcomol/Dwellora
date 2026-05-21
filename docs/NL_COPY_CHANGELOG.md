# Nederlandse copy — wijzigingenlog

Overzicht van gecorrigeerde of nieuwe gebruikersgerichte teksten (spelling, grammatica, terminologie).

| Bestand | Oude tekst | Nieuwe tekst |
|---------|------------|--------------|
| `src/i18n/locales/nl.json` | Totaal geschatte takosten | Totaal geschatte taakkosten |
| `src/i18n/locales/nl.json` | Geschatte takosten − totaal geregistreerd | Geschatte taakkosten − totaal geregistreerd |
| `src/i18n/locales/nl.json` | Geschatte takosten overschrijden… voor je vastlegt | Geschatte taakkosten overschrijden… voordat je vastlegt |
| `src/i18n/locales/nl.json` | …uit je live Supabase-gegevens | …uit je projectgegevens |
| `src/i18n/locales/nl.json` (help) | geschatte takosten (3×) | geschatte taakkosten |
| `supabase/functions/send-auth-email/index.ts` | Magic link | Directe inloglink |
| `supabase/functions/send-auth-email/index.ts` | login-methode (2×) | inlogmethode |

## Nieuwe i18n-keys

- `projectDetail.labelRooms`, `roomsRequired`, `noEstimate`, `roomEstimatedTotal`, `projectEstimatedTotal`
- `constructionDepot.*` (dashboard, sectie, taak-dropdown)
- `insights.depotOverBudget`

## Brevo-templates

Pas in het Brevo-dashboard de HTML uit [`BREVO_EMAIL_TEMPLATES.md`](BREVO_EMAIL_TEMPLATES.md) handmatig bij na wijzigingen in die documentatie.
