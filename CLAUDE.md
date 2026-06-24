@AGENTS.md

## Supabase database-discipline (BELANGRIJK)

Er zijn twee Supabase-databases:
- **Staging**: `cgvmclxglxhbuhuovedl` — ontwikkelen + testen. De lokale dev-server
  (.env.local) draait hiertegen.
- **PROD**: `qvansiwlykvhgfdygisu` — alleen voor echte gebruikers.

### Regels
1. Tijdens ontwikkeling staat de Supabase CLI **ALTIJD** gelinkt aan **Staging**.
   Controleer vóór elke `db push` met `npx supabase projects list` dat de ●
   bij "RenoTasker Staging" staat — NIET bij PROD.
2. Alle `npx supabase db push` tijdens ontwikkeling gaat naar Staging.
3. Een release naar PROD is een **apart, bewust ritueel**:
   - link tijdelijk naar PROD:
     `Remove-Item -Recurse -Force supabase\.temp`
     `npx supabase link --project-ref qvansiwlykvhgfdygisu`
   - `npx supabase db push`
   - link **DIRECT terug** naar Staging:
     `Remove-Item -Recurse -Force supabase\.temp`
     `npx supabase link --project-ref cgvmclxglxhbuhuovedl`
4. Alle schemawijzigingen uitsluitend via migration files + `db push`.
   Nooit via de SQL Editor of de management API (dat veroorzaakt schema-drift
   tussen migration-history en de echte database-inhoud).
5. Poort 5432 is vereist voor CLI-migratiecommando's. Het reguliere netwerk
   blokkeert die poort → gebruik een mobiele hotspot voor migratiewerk.

### Waarom deze discipline bestaat
In juni 2026 stond de CLI per ongeluk gelinkt aan PROD terwijl de app op Staging
draaide. Daardoor landden meerdere fixes (o.a. `fix_invite_digest`,
`fix_invite_search_path`, `planner_generations`) op de verkeerde database en leken
ze "wel te werken maar dan toch niet". Het kostte veel tijd om te ontdekken dat
CLI en app naar verschillende databases wezen. Deze regels voorkomen dat dit
opnieuw gebeurt.

### Snelle gezondheidscheck (bij twijfel)
- `npx supabase projects list` → staat de ● bij Staging?
- `npx supabase migration list` → Local = Remote op elke regel?
- Bij verschil tussen PROD en Staging: link om de beurt aan beide en vergelijk
  de `migration list` output.
