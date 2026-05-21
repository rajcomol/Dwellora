-- tasks.project_id for loose tasks (no task_rooms); room_task_summary view.

-- ---------------------------------------------------------------------------
-- tasks.project_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects (id) ON DELETE CASCADE;

UPDATE public.tasks t
SET project_id = r.project_id
FROM public.task_rooms tr
JOIN public.rooms r ON r.id = tr.room_id
WHERE t.id = tr.task_id
  AND t.project_id IS NULL;

-- Orphan tasks without rooms cannot be assigned a project; remove if any exist.
DELETE FROM public.tasks
WHERE project_id IS NULL;

ALTER TABLE public.tasks
  ALTER COLUMN project_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON public.tasks (project_id);
CREATE INDEX IF NOT EXISTS tasks_start_date_idx ON public.tasks (start_date);

-- ---------------------------------------------------------------------------
-- Access helper: room link OR direct project_id (loose tasks)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_task_access(tid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.task_rooms tr
    JOIN public.rooms r ON r.id = tr.room_id
    WHERE tr.task_id = tid
      AND public.user_has_project_access(r.project_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = tid
      AND public.user_has_project_access(t.project_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- tasks INSERT policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_insert_via_room" ON public.tasks;

CREATE POLICY "tasks_insert_via_room" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_project_access(project_id));

-- ---------------------------------------------------------------------------
-- Construction depot must match task project (rooms or project_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tasks_construction_depot_matches_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_depot_project uuid;
  v_task_project uuid;
BEGIN
  IF NEW.construction_depot_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT d.project_id INTO v_depot_project
  FROM public.construction_depots d
  WHERE d.id = NEW.construction_depot_id;

  IF v_depot_project IS NULL THEN
    RAISE EXCEPTION 'tasks.construction_depot_id not found';
  END IF;

  SELECT r.project_id INTO v_task_project
  FROM public.task_rooms tr
  JOIN public.rooms r ON r.id = tr.room_id
  WHERE tr.task_id = NEW.id
  LIMIT 1;

  IF v_task_project IS NULL THEN
    v_task_project := NEW.project_id;
  END IF;

  IF v_task_project IS NULL THEN
    RAISE EXCEPTION 'task must have project_id or room link before assigning a construction depot';
  END IF;

  IF v_depot_project <> v_task_project THEN
    RAISE EXCEPTION 'construction depot must belong to the same project as the task';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- project_expenses: task in same project via task_rooms or tasks.project_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.project_expenses_task_matches_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.task_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.task_rooms tr
    JOIN public.rooms r ON r.id = tr.room_id
    WHERE tr.task_id = NEW.task_id
      AND r.project_id = NEW.project_id
  ) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = NEW.task_id
      AND t.project_id = NEW.project_id
  ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'project_expenses.task_id must reference a task in the same project';
END;
$$;

-- ---------------------------------------------------------------------------
-- room_task_summary view (per-room aggregates; multi-room tasks count per room)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.room_task_summary
WITH (security_invoker = true)
AS
SELECT
  r.id AS room_id,
  r.project_id,
  r.name AS room_name,
  COUNT(t.id)::int AS task_count,
  COUNT(t.id) FILTER (WHERE t.status = 'done')::int AS completed_count,
  COALESCE(SUM(t.estimated_cost), 0) AS estimated_cost_sum,
  MIN(t.start_date) AS earliest_start_date,
  MAX(
    CASE
      WHEN t.start_date IS NOT NULL THEN
        (t.start_date + (GREATEST(COALESCE(t.duration_days, 1), 1) - 1) * INTERVAL '1 day')::date
    END
  ) AS latest_end_date
FROM public.rooms r
LEFT JOIN public.task_rooms tr ON tr.room_id = r.id
LEFT JOIN public.tasks t ON t.id = tr.task_id
GROUP BY r.id, r.project_id, r.name;

COMMENT ON VIEW public.room_task_summary IS
  'Per-room task counts, completion, cost sum, and date range. Multi-room tasks appear in each linked room.';

GRANT SELECT ON public.room_task_summary TO authenticated;
