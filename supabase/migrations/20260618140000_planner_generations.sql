-- Daily Sfeerbeeld generation usage (visualiseer + verfijn combined).

CREATE TABLE public.planner_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('visualiseer', 'verfijn')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX planner_generations_user_created_idx
  ON public.planner_generations (user_id, created_at);

ALTER TABLE public.planner_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planner_generations_select_own"
  ON public.planner_generations
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "planner_generations_insert_own"
  ON public.planner_generations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.get_planner_daily_usage(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_start timestamptz;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_user_id THEN
    RETURN 0;
  END IF;

  v_day_start := date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'Europe/Amsterdam';

  RETURN (
    SELECT COUNT(*)::integer
    FROM public.planner_generations
    WHERE user_id = p_user_id
      AND created_at >= v_day_start
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_planner_daily_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_planner_daily_usage(uuid) TO authenticated;
