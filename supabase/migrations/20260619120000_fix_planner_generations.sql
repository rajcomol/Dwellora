-- Repair migration: 20260618140000_planner_generations is registered as "applied"
-- in the Supabase migration history, but its objects do not exist on the database
-- (table public.planner_generations and function public.get_planner_daily_usage are
-- missing), which makes /api/planner/quota fail with:
--   "Could not find the function public.get_planner_daily_usage(p_user_id)".
--
-- This migration recreates everything idempotently, so it is safe to run even when
-- some parts already exist.

-- 1. Table -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.planner_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('visualiseer', 'verfijn')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planner_generations_user_created_idx
  ON public.planner_generations (user_id, created_at);

-- 2. Row Level Security ------------------------------------------------------

ALTER TABLE public.planner_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planner_generations_select_own" ON public.planner_generations;
CREATE POLICY "planner_generations_select_own"
  ON public.planner_generations
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "planner_generations_insert_own" ON public.planner_generations;
CREATE POLICY "planner_generations_insert_own"
  ON public.planner_generations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- No UPDATE/DELETE policies: users cannot mutate usage history.

-- 3. RPC ---------------------------------------------------------------------
-- Parameter name MUST stay p_user_id: the app calls it as
-- supabase.rpc("get_planner_daily_usage", { p_user_id: userId })
-- (see src/lib/planner/dailyLimit.ts).

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
  -- SECURITY DEFINER bypasses RLS, so guard against reading another user's usage.
  IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_user_id THEN
    RETURN 0;
  END IF;

  -- Start of "today" in the Amsterdam timezone, expressed as timestamptz.
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

-- 4. Refresh PostgREST schema cache so the RPC becomes available immediately. --

NOTIFY pgrst, 'reload schema';
