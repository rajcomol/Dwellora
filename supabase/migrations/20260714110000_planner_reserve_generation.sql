-- Atomaire check-en-registratie voor de Sfeerbeeld-daglimiet (M2 audit-fix).
--
-- Probleem: de routes lazen eerst de limiet (get_planner_daily_usage) en
-- registreerden de generatie pas NA de dure OpenAI-call. Twee gelijktijdige
-- requests konden allebei de check passeren en zo net over de limiet komen.
--
-- Oplossing: één RPC die tellen + registreren atomair doet. Een per-gebruiker
-- advisory lock serialiseert gelijktijdige reserveringen van dezelfde gebruiker,
-- zodat count-daarna-insert echt atomair is (READ COMMITTED alleen is niet genoeg:
-- ongecommitte inserts zijn onzichtbaar voor parallelle transacties).
--
-- SECURITY INVOKER + search_path = public: RLS blijft gelden, dus een gebruiker
-- kan alleen zijn eigen verbruik tellen en alleen voor zichzelf registreren.
-- De limiet komt uit env (PLANNER_DAILY_LIMIT) en wordt als parameter meegegeven.

CREATE OR REPLACE FUNCTION public.reserve_planner_generation(
  p_user_id uuid,
  p_kind text,
  p_limit int
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_day_start timestamptz;
  v_used int;
BEGIN
  -- Alleen de ingelogde caller mag voor zichzelf reserveren.
  IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_user_id THEN
    RETURN json_build_object('ok', false, 'used', 0, 'limit', p_limit);
  END IF;

  IF p_kind NOT IN ('visualiseer', 'verfijn') THEN
    RAISE EXCEPTION 'invalid planner generation kind: %', p_kind;
  END IF;

  -- Serialiseer gelijktijdige reserveringen voor dezelfde gebruiker. De lock
  -- wordt automatisch vrijgegeven aan het einde van de transactie (de functie).
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  -- Start van "vandaag" in de Amsterdam-tijdzone (zelfde logica als get_planner_daily_usage).
  v_day_start := date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'Europe/Amsterdam';

  SELECT COUNT(*)::int INTO v_used
  FROM public.planner_generations
  WHERE user_id = p_user_id
    AND created_at >= v_day_start;

  IF v_used >= p_limit THEN
    RETURN json_build_object('ok', false, 'used', v_used, 'limit', p_limit);
  END IF;

  INSERT INTO public.planner_generations (user_id, kind)
  VALUES (p_user_id, p_kind);

  RETURN json_build_object('ok', true, 'used', v_used + 1, 'limit', p_limit);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_planner_generation(uuid, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_planner_generation(uuid, text, int) TO authenticated;

-- Ververs de PostgREST-schemacache zodat de RPC direct beschikbaar is.
NOTIFY pgrst, 'reload schema';
