-- Construction depots (bouwdepots) per project + optional task funding link.

-- ---------------------------------------------------------------------------
-- construction_depots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.construction_depots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  name text NOT NULL,
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS construction_depots_project_id_idx
  ON public.construction_depots (project_id);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS construction_depot_id uuid
  REFERENCES public.construction_depots (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_construction_depot_id_idx
  ON public.tasks (construction_depot_id)
  WHERE construction_depot_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Balances view (spent = sum of linked task estimated_cost)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.construction_depot_balances
WITH (security_invoker = true)
AS
SELECT
  d.id,
  d.project_id,
  d.name,
  d.total_amount,
  d.created_at,
  d.user_id,
  COALESCE(SUM(t.estimated_cost), 0) AS spent_estimated,
  d.total_amount - COALESCE(SUM(t.estimated_cost), 0) AS remaining_estimated,
  COUNT(t.id)::int AS linked_task_count
FROM public.construction_depots d
LEFT JOIN public.tasks t ON t.construction_depot_id = d.id
GROUP BY d.id;

-- ---------------------------------------------------------------------------
-- Validate task.depot belongs to same project as task rooms
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
    RAISE EXCEPTION 'task must be linked to at least one room before assigning a construction depot';
  END IF;

  IF v_depot_project <> v_task_project THEN
    RAISE EXCEPTION 'construction depot must belong to the same project as the task';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_construction_depot_project_trg ON public.tasks;
CREATE TRIGGER tasks_construction_depot_project_trg
  BEFORE INSERT OR UPDATE OF construction_depot_id ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.tasks_construction_depot_matches_project();

-- ---------------------------------------------------------------------------
-- RLS: construction_depots
-- ---------------------------------------------------------------------------
ALTER TABLE public.construction_depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_depots FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "construction_depots_select" ON public.construction_depots;
DROP POLICY IF EXISTS "construction_depots_insert" ON public.construction_depots;
DROP POLICY IF EXISTS "construction_depots_update" ON public.construction_depots;
DROP POLICY IF EXISTS "construction_depots_delete" ON public.construction_depots;

CREATE POLICY "construction_depots_select" ON public.construction_depots
  FOR SELECT TO authenticated
  USING (public.user_has_project_access(construction_depots.project_id));

CREATE POLICY "construction_depots_insert" ON public.construction_depots
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_project_access(construction_depots.project_id)
    AND construction_depots.user_id = (SELECT auth.uid())
  );

CREATE POLICY "construction_depots_update" ON public.construction_depots
  FOR UPDATE TO authenticated
  USING (public.user_has_project_access(construction_depots.project_id))
  WITH CHECK (public.user_has_project_access(construction_depots.project_id));

CREATE POLICY "construction_depots_delete" ON public.construction_depots
  FOR DELETE TO authenticated
  USING (public.user_has_project_access(construction_depots.project_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.construction_depots TO authenticated;
GRANT SELECT ON public.construction_depot_balances TO authenticated;

COMMENT ON TABLE public.construction_depots IS 'Project construction depots (bouwdepots) with optional task cost allocation.';
