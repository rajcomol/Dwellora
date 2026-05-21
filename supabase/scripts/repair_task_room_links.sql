-- ONLY run if diagnose shows tasks exist (count > 0) but task_rooms is empty or incomplete.
-- Re-links every task to rooms via existing task_rooms rows (no-op if already linked).
-- Does NOT restore deleted task rows.

INSERT INTO public.task_rooms (task_id, room_id)
SELECT tr.task_id, tr.room_id
FROM public.task_rooms tr
ON CONFLICT (task_id, room_id) DO NOTHING;

-- If tasks exist with project_id but zero task_rooms and you have NO backup,
-- you must re-assign rooms manually in the app (or restore from Supabase backup).

-- Ensure project_id matches room's project (fix mismatches)
UPDATE public.tasks t
SET project_id = r.project_id
FROM public.task_rooms tr
JOIN public.rooms r ON r.id = tr.room_id
WHERE t.id = tr.task_id
  AND t.project_id IS DISTINCT FROM r.project_id;
