-- Fix tasks RLS after task_rooms migration (INSERT/SELECT for new rows with project_id).
-- Prod/staging may still have policies referencing dropped tasks.room_id, or missing GRANTs.

-- ---------------------------------------------------------------------------
-- Ensure access helpers exist (idempotent)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_project_access(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = pid
      AND (
        p.user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.project_members m
          WHERE m.project_id = p.id
            AND m.user_id = (SELECT auth.uid())
        )
      )
  );
$$;

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

GRANT EXECUTE ON FUNCTION public.user_has_project_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_task_access(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Replace tasks policies (drop stale room_id-based policies)
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
  WITH CHECK (public.user_has_project_access(project_id));

CREATE POLICY "tasks_update_via_room" ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.user_has_task_access(tasks.id))
  WITH CHECK (public.user_has_task_access(tasks.id));

CREATE POLICY "tasks_delete_via_room" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.user_has_task_access(tasks.id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;

COMMENT ON POLICY "tasks_insert_via_room" ON public.tasks IS
  'Insert task when caller has access to tasks.project_id (incl. before task_rooms links exist).';
