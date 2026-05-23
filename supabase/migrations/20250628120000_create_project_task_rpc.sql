-- Atomic task + task_rooms create via SECURITY DEFINER (bypasses RLS edge cases on INSERT…RETURNING).

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

COMMENT ON FUNCTION public.create_project_task IS
  'Creates a task and optional task_rooms links after user_has_project_access check.';
