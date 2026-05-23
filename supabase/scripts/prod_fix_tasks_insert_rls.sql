-- =============================================================================
-- STAGING / PROD: Fix tasks INSERT (RLS "new row violates row-level security")
-- =============================================================================
-- Symptoom: taak aanmaken faalt met RLS op public.tasks (app: Opslaan mislukt).
-- Oorzaak: verouderde policies (tasks.room_id) of ontbrekende INSERT/SELECT policies.
--
-- Uitvoeren in Supabase SQL Editor op staging, test, daarna productie.
-- Idempotent — veilig opnieuw te draaien.
-- =============================================================================

-- STAP 0 — Diagnose (geen wijziging)
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'project_id'
  ) AS has_tasks_project_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'room_id'
  ) AS has_legacy_room_id,
  (
    SELECT count(*)::int
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tasks'
  ) AS tasks_policy_count;

SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tasks'
ORDER BY policyname;

-- STAP 1 — Helpers + policies (zelfde als migratie 20250627120000)
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

DROP POLICY IF EXISTS "tasks_select_via_room" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_via_room" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_via_room" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_via_room" ON public.tasks;

CREATE POLICY "tasks_select_via_room" ON public.tasks
  FOR SELECT TO authenticated
  USING (public.user_has_task_access(id));

CREATE POLICY "tasks_insert_via_room" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_project_access(project_id));

CREATE POLICY "tasks_update_via_room" ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.user_has_task_access(id))
  WITH CHECK (public.user_has_task_access(id));

CREATE POLICY "tasks_delete_via_room" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.user_has_task_access(id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;

-- STAP 2 — Verificatie
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tasks'
ORDER BY policyname;
