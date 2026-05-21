-- =============================================================================
-- RenoTasker — diagnose taken na migratie project_id
-- Project: zelfde als NEXT_PUBLIC_SUPABASE_URL in .env.local (bijv. Staging)
-- Run elk blok apart in Supabase SQL Editor, of alles in één keer.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Aantallen (run dit eerst)
-- -----------------------------------------------------------------------------
SELECT 'tasks' AS tabel, count(*)::bigint AS aantal FROM public.tasks
UNION ALL
SELECT 'task_rooms', count(*) FROM public.task_rooms
UNION ALL
SELECT 'rooms', count(*) FROM public.rooms
UNION ALL
SELECT 'projects', count(*) FROM public.projects
ORDER BY tabel;

-- -----------------------------------------------------------------------------
-- B) Taken ZONDER ruimte (verschijnen als "losse taken", niet op ruimtekaarten)
-- -----------------------------------------------------------------------------
SELECT
  t.id,
  t.project_id,
  p.name AS project_naam,
  t.title,
  t.status,
  t.start_date,
  t.duration_days,
  t.estimated_cost,
  t.actual_cost,
  t.priority,
  t.sort_order
FROM public.tasks t
LEFT JOIN public.projects p ON p.id = t.project_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.task_rooms tr WHERE tr.task_id = t.id
)
ORDER BY p.name, t.title;

-- -----------------------------------------------------------------------------
-- C) Taken MET ruimte (normale situatie — per ruimte in de app)
-- -----------------------------------------------------------------------------
SELECT
  t.id,
  t.title,
  t.status,
  t.start_date,
  t.duration_days,
  t.estimated_cost,
  p.name AS project_naam,
  string_agg(r.name, ', ' ORDER BY r.name) AS ruimtes
FROM public.tasks t
JOIN public.task_rooms tr ON tr.task_id = t.id
JOIN public.rooms r ON r.id = tr.room_id
JOIN public.projects p ON p.id = r.project_id
GROUP BY
  t.id, t.title, t.status, t.start_date, t.duration_days, t.estimated_cost, p.name
ORDER BY p.name, ruimtes, t.title;

-- -----------------------------------------------------------------------------
-- D) Verweesde koppelingen (taak verwijderd, link nog over — meestal 0)
-- -----------------------------------------------------------------------------
SELECT
  tr.task_id,
  tr.room_id,
  r.name AS ruimte_naam,
  r.project_id
FROM public.task_rooms tr
LEFT JOIN public.tasks t ON t.id = tr.task_id
JOIN public.rooms r ON r.id = tr.room_id
WHERE t.id IS NULL
LIMIT 50;

-- -----------------------------------------------------------------------------
-- E) Ruimtes zonder taken (overzicht leeg per kaart)
-- -----------------------------------------------------------------------------
SELECT
  r.id AS room_id,
  r.name AS ruimte_naam,
  p.name AS project_naam,
  count(tr.task_id)::int AS gekoppelde_taken
FROM public.rooms r
JOIN public.projects p ON p.id = r.project_id
LEFT JOIN public.task_rooms tr ON tr.room_id = r.id
GROUP BY r.id, r.name, p.name
HAVING count(tr.task_id) = 0
ORDER BY p.name, r.name;

-- -----------------------------------------------------------------------------
-- F) Samenvatting per project
-- -----------------------------------------------------------------------------
SELECT
  p.id AS project_id,
  p.name AS project_naam,
  (SELECT count(*) FROM public.rooms rm WHERE rm.project_id = p.id) AS ruimtes,
  (SELECT count(*) FROM public.tasks tk WHERE tk.project_id = p.id) AS taken,
  (SELECT count(*)
   FROM public.tasks tk
   WHERE tk.project_id = p.id
     AND EXISTS (SELECT 1 FROM public.task_rooms tr WHERE tr.task_id = tk.id)
  ) AS taken_met_ruimte,
  (SELECT count(*)
   FROM public.tasks tk
   WHERE tk.project_id = p.id
     AND NOT EXISTS (SELECT 1 FROM public.task_rooms tr WHERE tr.task_id = tk.id)
  ) AS losse_taken
FROM public.projects p
ORDER BY p.name;

-- -----------------------------------------------------------------------------
-- G) Kolommen-check (optioneel — welke velden bestaan op tasks)
-- -----------------------------------------------------------------------------
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tasks'
ORDER BY ordinal_position;
