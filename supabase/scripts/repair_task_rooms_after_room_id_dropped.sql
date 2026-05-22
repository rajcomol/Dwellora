-- =============================================================================
-- Herstel task_rooms (tasks.room_id bestaat niet meer)
-- Run elk blok APART in Supabase SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Diagnose — alleen SELECT, geen placeholders
-- -----------------------------------------------------------------------------
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tasks'
  AND column_name = 'room_id';

SELECT
  r.name AS ruimte,
  count(tr.task_id)::int AS gekoppelde_taken
FROM public.rooms r
JOIN public.projects p ON p.id = r.project_id
LEFT JOIN public.task_rooms tr ON tr.room_id = r.id
WHERE p.name ILIKE '%raj%' OR p.name ILIKE '%fe%'
GROUP BY r.id, r.name
ORDER BY r.name;

SELECT t.id AS task_id, t.title, t.status, p.name AS project
FROM public.tasks t
JOIN public.projects p ON p.id = t.project_id
WHERE (p.name ILIKE '%raj%' OR p.name ILIKE '%fe%')
  AND NOT EXISTS (SELECT 1 FROM public.task_rooms tr WHERE tr.task_id = t.id)
ORDER BY t.title;

-- Ruimtes met echte UUIDs (voor handmatige koppeling)
SELECT r.id AS room_id, r.name AS ruimte, p.name AS project
FROM public.rooms r
JOIN public.projects p ON p.id = r.project_id
WHERE p.name ILIKE '%raj%' OR p.name ILIKE '%fe%'
ORDER BY p.name, r.name;

-- -----------------------------------------------------------------------------
-- B) Automatisch koppelen: taaktitel bevat ruimtenaam (heuristiek)
--     Controleer eerst met de SELECT; run INSERT alleen als resultaat klopt.
-- -----------------------------------------------------------------------------
-- Preview:
SELECT t.id AS task_id, t.title, r.id AS room_id, r.name AS ruimte
FROM public.tasks t
JOIN public.projects p ON p.id = t.project_id
JOIN public.rooms r ON r.project_id = p.id
WHERE (p.name ILIKE '%raj%' OR p.name ILIKE '%fe%')
  AND NOT EXISTS (SELECT 1 FROM public.task_rooms tr WHERE tr.task_id = t.id)
  AND t.title ILIKE '%' || r.name || '%'
ORDER BY t.title, r.name;

-- Uitvoeren (alleen na goede preview):
-- INSERT INTO public.task_rooms (task_id, room_id)
-- SELECT t.id, r.id
-- FROM public.tasks t
-- JOIN public.projects p ON p.id = t.project_id
-- JOIN public.rooms r ON r.project_id = p.id
-- WHERE (p.name ILIKE '%raj%' OR p.name ILIKE '%fe%')
--   AND NOT EXISTS (SELECT 1 FROM public.task_rooms tr WHERE tr.task_id = t.id)
--   AND t.title ILIKE '%' || r.name || '%'
-- ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- C) Import uit PROD: genereer INSERT-regels (run export in PROD-project)
-- -----------------------------------------------------------------------------
-- PROD export:
-- SELECT
--   'INSERT INTO public.task_rooms (task_id, room_id) VALUES (''' ||
--   tr.task_id::text || ''', ''' || tr.room_id::text || ''') ON CONFLICT DO NOTHING;'
-- FROM public.task_rooms tr
-- JOIN public.rooms r ON r.id = tr.room_id
-- JOIN public.projects p ON p.id = r.project_id
-- WHERE p.name ILIKE '%raj%' OR p.name ILIKE '%fe%';

-- -----------------------------------------------------------------------------
-- D) Eén echte koppeling (vervang met UUIDs uit query A/D, geen <...>)
-- -----------------------------------------------------------------------------
-- INSERT INTO public.task_rooms (task_id, room_id)
-- VALUES ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid)
-- ON CONFLICT DO NOTHING;
