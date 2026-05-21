-- =============================================================================
-- Vergelijk project "Raj & Fe" (of vergelijkbare naam) — run in SUPABASE PROJECT:
--   • RenoTasker PROD  = productie-app (qvansiwlykvhgfdygisu)
--   • RenoTasker Staging = lokaal .env.local (cgvmclxglxhbuhuovedl)
-- Run dit script in BEIDE projecten en vergelijk de resultaten.
-- =============================================================================

-- 1) Zoek project(en) met Raj / Fe in de naam
SELECT id, name, created_at
FROM public.projects
WHERE name ILIKE '%raj%' OR name ILIKE '%fe%'
ORDER BY name;

-- 2) Per gevonden project: ruimtes + aantal taken
SELECT
  p.name AS project_naam,
  r.name AS ruimte,
  count(tr.task_id)::int AS taken_in_ruimte
FROM public.projects p
JOIN public.rooms r ON r.project_id = p.id
LEFT JOIN public.task_rooms tr ON tr.room_id = r.id
WHERE p.name ILIKE '%raj%' OR p.name ILIKE '%fe%'
GROUP BY p.id, p.name, r.id, r.name
ORDER BY p.name, r.name;

-- 3) Alle taken voor Raj/Fe-projecten (titels zoals in prod: Woonkamer, dweilen, …)
SELECT
  p.name AS project_naam,
  r.name AS ruimte,
  t.title,
  t.status,
  t.start_date,
  t.duration_days,
  t.sort_order
FROM public.tasks t
JOIN public.projects p ON p.id = t.project_id
LEFT JOIN public.task_rooms tr ON tr.task_id = t.id
LEFT JOIN public.rooms r ON r.id = tr.room_id
WHERE p.name ILIKE '%raj%' OR p.name ILIKE '%fe%'
ORDER BY p.name, r.name, t.title;

-- 4) Totalen Raj/Fe-projecten
SELECT
  p.name,
  (SELECT count(*) FROM public.rooms rm WHERE rm.project_id = p.id) AS ruimtes,
  (SELECT count(*) FROM public.tasks tk WHERE tk.project_id = p.id) AS taken_totaal
FROM public.projects p
WHERE p.name ILIKE '%raj%' OR p.name ILIKE '%fe%'
ORDER BY p.name;
