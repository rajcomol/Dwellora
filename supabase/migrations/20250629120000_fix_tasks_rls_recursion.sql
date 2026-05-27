-- Break tasks RLS recursion ("stack depth limit exceeded").
--
-- Cause: tasks SELECT policy called user_has_task_access(), which queried
-- public.tasks again under SECURITY INVOKER → tasks RLS re-fired indefinitely.
--
-- Fix:
-- 1. tasks policies use user_has_project_access(project_id) on the row.
-- 2. Access helpers are SECURITY DEFINER and read base tables without RLS loops.
-- 3. user_has_task_access only resolves project_id (all tasks have project_id).

CREATE OR REPLACE FUNCTION public.user_has_project_access(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = tid
      AND public.user_has_project_access(t.project_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_project_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_task_access(uuid) TO authenticated;

-- tasks: direct project_id check (no user_has_task_access on this table)
DROP POLICY IF EXISTS "tasks_select_via_room" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_via_room" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_via_room" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_via_room" ON public.tasks;

CREATE POLICY "tasks_select_via_room" ON public.tasks
  FOR SELECT TO authenticated
  USING (public.user_has_project_access(project_id));

CREATE POLICY "tasks_insert_via_room" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_project_access(project_id));

CREATE POLICY "tasks_update_via_room" ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.user_has_project_access(project_id))
  WITH CHECK (public.user_has_project_access(project_id));

CREATE POLICY "tasks_delete_via_room" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.user_has_project_access(project_id));

COMMENT ON FUNCTION public.user_has_task_access(uuid) IS
  'SECURITY DEFINER: resolve task project_id without re-entering tasks RLS. For child tables only.';
COMMENT ON FUNCTION public.user_has_project_access(uuid) IS
  'SECURITY DEFINER: owner/collaborator check without re-entering projects RLS.';
COMMENT ON POLICY "tasks_select_via_room" ON public.tasks IS
  'SELECT via tasks.project_id; avoids user_has_task_access recursion on this table.';
