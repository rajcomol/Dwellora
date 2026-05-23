-- =============================================================================
-- STAGING / PROD: Fix taak aanmaken (RLS) + RPC create_project_task
-- =============================================================================
-- Symptoom: "new row violates row-level security policy for table tasks"
-- Uitvoeren in Supabase SQL Editor (staging → prod). Idempotent.
-- =============================================================================

-- STAP 0 — Diagnose
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'project_id'
  ) AS has_tasks_project_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'room_id'
  ) AS has_legacy_room_id,
  to_regprocedure('public.create_project_task(uuid,text,text,text,numeric,numeric,numeric,text,text,integer,date,uuid,boolean,uuid[])') IS NOT NULL
    AS has_create_project_task_rpc;

SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tasks'
ORDER BY policyname;

-- STAP 1 — Access helpers
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

-- STAP 2 — tasks RLS policies
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_rooms TO authenticated;

-- STAP 3 — RPC (betrouwbaar taak + ruimtes aanmaken)
CREATE OR REPLACE FUNCTION public.create_project_task(
  p_project_id uuid,
  p_title text,
  p_renovation_phase text,
  p_status text,
  p_estimated_cost numeric,
  p_actual_cost numeric,
  p_duration_days numeric,
  p_priority text,
  p_description text DEFAULT '',
  p_sort_order integer DEFAULT 0,
  p_start_date date DEFAULT NULL,
  p_assigned_roster_id uuid DEFAULT NULL,
  p_funded_by_construction_depot boolean DEFAULT false,
  p_room_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS public.tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.tasks;
  v_room uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.user_has_project_access(p_project_id) THEN
    RAISE EXCEPTION 'project access denied for %', p_project_id;
  END IF;

  IF p_room_ids IS NOT NULL AND array_length(p_room_ids, 1) IS NOT NULL THEN
    FOREACH v_room IN ARRAY p_room_ids LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM public.rooms r
        WHERE r.id = v_room
          AND r.project_id = p_project_id
      ) THEN
        RAISE EXCEPTION 'room % is not in project %', v_room, p_project_id;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.tasks (
    project_id,
    title,
    renovation_phase,
    status,
    estimated_cost,
    actual_cost,
    duration_days,
    priority,
    description,
    sort_order,
    start_date,
    assigned_roster_id,
    funded_by_construction_depot
  )
  VALUES (
    p_project_id,
    trim(p_title),
    p_renovation_phase,
    p_status,
    p_estimated_cost,
    coalesce(p_actual_cost, 0),
    p_duration_days,
    p_priority,
    coalesce(trim(p_description), ''),
    coalesce(p_sort_order, 0),
    p_start_date,
    p_assigned_roster_id,
    coalesce(p_funded_by_construction_depot, false)
  )
  RETURNING * INTO v_task;

  IF p_room_ids IS NOT NULL AND array_length(p_room_ids, 1) IS NOT NULL THEN
    INSERT INTO public.task_rooms (task_id, room_id)
    SELECT v_task.id, r_id
    FROM unnest(p_room_ids) AS r_id
    ON CONFLICT (task_id, room_id) DO NOTHING;
  END IF;

  RETURN v_task;
END;
$$;

REVOKE ALL ON FUNCTION public.create_project_task(
  uuid, text, text, text, numeric, numeric, numeric, text, text, integer, date, uuid, boolean, uuid[]
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_project_task(
  uuid, text, text, text, numeric, numeric, numeric, text, text, integer, date, uuid, boolean, uuid[]
) TO authenticated;

-- STAP 4 — Verificatie
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tasks'
ORDER BY policyname;

SELECT to_regprocedure('public.create_project_task(uuid,text,text,text,numeric,numeric,numeric,text,text,integer,date,uuid,boolean,uuid[])') IS NOT NULL
  AS create_project_task_ready;
