-- Many-to-many tasks <-> rooms via task_rooms; drop tasks.room_id.

-- ---------------------------------------------------------------------------
-- Junction table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_rooms (
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, room_id)
);

CREATE INDEX IF NOT EXISTS task_rooms_room_id_idx ON public.task_rooms (room_id);
CREATE INDEX IF NOT EXISTS task_rooms_task_id_idx ON public.task_rooms (task_id);

-- Backfill from legacy column
INSERT INTO public.task_rooms (task_id, room_id)
SELECT id, room_id FROM public.tasks
ON CONFLICT (task_id, room_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Access helper for tasks (any linked room in an accessible project)
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
  );
$$;

-- ---------------------------------------------------------------------------
-- Drop legacy index and column
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.tasks_room_id_idx;

ALTER TABLE public.tasks DROP COLUMN IF EXISTS room_id;

-- ---------------------------------------------------------------------------
-- task_rooms RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.task_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_rooms FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_rooms_select" ON public.task_rooms;
DROP POLICY IF EXISTS "task_rooms_insert" ON public.task_rooms;
DROP POLICY IF EXISTS "task_rooms_update" ON public.task_rooms;
DROP POLICY IF EXISTS "task_rooms_delete" ON public.task_rooms;

CREATE POLICY "task_rooms_select" ON public.task_rooms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      WHERE r.id = task_rooms.room_id
        AND public.user_has_project_access(r.project_id)
    )
  );

CREATE POLICY "task_rooms_insert" ON public.task_rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      WHERE r.id = task_rooms.room_id
        AND public.user_has_project_access(r.project_id)
    )
  );

CREATE POLICY "task_rooms_update" ON public.task_rooms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      WHERE r.id = task_rooms.room_id
        AND public.user_has_project_access(r.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      WHERE r.id = task_rooms.room_id
        AND public.user_has_project_access(r.project_id)
    )
  );

CREATE POLICY "task_rooms_delete" ON public.task_rooms
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      WHERE r.id = task_rooms.room_id
        AND public.user_has_project_access(r.project_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_rooms TO authenticated;

-- ---------------------------------------------------------------------------
-- tasks RLS (via task_rooms)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_select_via_room" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_via_room" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_via_room" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_via_room" ON public.tasks;

CREATE POLICY "tasks_select_via_room" ON public.tasks
  FOR SELECT TO authenticated
  USING (public.user_has_task_access(tasks.id));

CREATE POLICY "tasks_insert_via_room" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "tasks_update_via_room" ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.user_has_task_access(tasks.id))
  WITH CHECK (public.user_has_task_access(tasks.id));

CREATE POLICY "tasks_delete_via_room" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.user_has_task_access(tasks.id));

-- ---------------------------------------------------------------------------
-- task_dependencies RLS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "task_deps_select" ON public.task_dependencies;
DROP POLICY IF EXISTS "task_deps_insert" ON public.task_dependencies;
DROP POLICY IF EXISTS "task_deps_delete" ON public.task_dependencies;

CREATE POLICY "task_deps_select" ON public.task_dependencies
  FOR SELECT TO authenticated
  USING (public.user_has_task_access(task_dependencies.task_id));

CREATE POLICY "task_deps_insert" ON public.task_dependencies
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_task_access(task_dependencies.task_id)
    AND public.user_has_task_access(task_dependencies.depends_on_task_id)
  );

CREATE POLICY "task_deps_delete" ON public.task_dependencies
  FOR DELETE TO authenticated
  USING (public.user_has_task_access(task_dependencies.task_id));

-- ---------------------------------------------------------------------------
-- task_attachments RLS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "task_attachments_select" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_insert" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_delete" ON public.task_attachments;

CREATE POLICY "task_attachments_select" ON public.task_attachments
  FOR SELECT TO authenticated
  USING (public.user_has_task_access(task_attachments.task_id));

CREATE POLICY "task_attachments_insert" ON public.task_attachments
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_task_access(task_attachments.task_id));

CREATE POLICY "task_attachments_delete" ON public.task_attachments
  FOR DELETE TO authenticated
  USING (public.user_has_task_access(task_attachments.task_id));

-- ---------------------------------------------------------------------------
-- project_expenses: task must belong to same project (via task_rooms)
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
  IF NOT EXISTS (
    SELECT 1
    FROM public.task_rooms tr
    JOIN public.rooms r ON r.id = tr.room_id
    WHERE tr.task_id = NEW.task_id
      AND r.project_id = NEW.project_id
  ) THEN
    RAISE EXCEPTION 'project_expenses.task_id must reference a task in the same project';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON TABLE public.task_rooms IS 'Many-to-many link between tasks and rooms.';
