# Kennisbank (Help Center) onderhouden

De in-app **Kennisbank** (`/dashboard/help`) en de **Kluscoach** gebruiken dezelfde inhoud: artikelen in [`src/i18n/locales/nl.json`](../src/i18n/locales/nl.json) onder `help.article.<id>.{title,summary,body}`.

## Bestanden die je meestal aanpast

| Bestand | Wat |
|--------|-----|
| [`src/content/help/types.ts`](../src/content/help/types.ts) | Nieuwe `HelpArticleId` / `HelpCategoryId` toevoegen. |
| [`src/content/help/registry.ts`](../src/content/help/registry.ts) | Categorieën (`HELP_CATEGORIES`), artikelvolgorde, `tags` (zoeken), metadata. **Volgorde van `ARTICLE_META`-keys** bepaalt de volgorde waarin teksten naar de Kluscoach gaan. |
| [`src/i18n/locales/nl.json`](../src/i18n/locales/nl.json) | `help.category.*` en `help.article.<id>.*` |
| [`src/lib/help/topic-param.ts`](../src/lib/help/topic-param.ts) | Whitelist voor `?topic=` op de help-URL. |
| [`src/lib/help/route-topic.ts`](../src/lib/help/route-topic.ts) | Suggestie voor “Hulp bij dit scherm” (eerste match wint). |

## Nieuwe artikel toevoegen

1. Voeg een slug toe aan `HelpArticleId` in `types.ts`.
2. Registreer het artikel in `registry.ts`: `HELP_CATEGORIES` (onder de juiste categorie) en `ARTICLE_META` (met `categoryId` en `tags`). Plaats **belangrijke** artikelen **boven** in het object als de KB groot wordt (zie hieronder).
3. Voeg `title`, `summary` en `body` toe in `nl.json` onder `help.article.<slug>`. Gebruik `\n\n` tussen alinea’s in `body`.
4. Zet de slug in de whitelist in `topic-param.ts`.
5. Optioneel: voeg een regel toe in `route-topic.ts` als dit artikel contextueel bij een route hoort.

## Kluscoach en tekstlimiet

[`buildHelpKnowledgeText`](../src/lib/help/helpKnowledgeForModel.ts) zet alle artikelen achter elkaar. Daarna wordt ingekort met [`getHelpKbMaxChars`](../src/lib/ai/limits.ts) (standaard **28.000** tekens; override met `OPENAI_HELP_KB_MAX_CHARS` in `.env` / Vercel).

- Als antwoorden over app-navigatie “incomplete” worden, verhoog de limiet of zet **kritieke** artikelen eerder in `ARTICLE_META`.
- Na grote uitbreidingen: test de Kluscoach met vragen over specifieke schermen.

## Stijl

- Nederlands, korte alinea’s.
- Geen functies of menu’s beloven die niet in de app bestaan (consistent met de system prompt in `/api/chat`).
- `tags` in het register: kleine letters, synoniemen voor zoeken in de kennisbank-UI.
