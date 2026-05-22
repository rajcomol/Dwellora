-- Ensure project_expenses.task_id exists (idempotent; fixes DBs that skipped 20250403120000).
-- Optional link from a loose project expense to a task in the same project.

ALTER TABLE public.project_expenses
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS project_expenses_task_id_idx
  ON public.project_expenses (task_id)
  WHERE task_id IS NOT NULL;

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

DROP TRIGGER IF EXISTS project_expenses_task_project_trg ON public.project_expenses;
CREATE TRIGGER project_expenses_task_project_trg
  BEFORE INSERT OR UPDATE OF task_id, project_id ON public.project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.project_expenses_task_matches_project();
