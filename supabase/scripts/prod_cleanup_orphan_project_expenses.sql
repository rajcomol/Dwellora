-- =============================================================================
-- STAGING / PROD: Wees-uitgaven opschonen (eenmalig, volledige run)
-- =============================================================================
-- Uitvoeren in Supabase SQL Editor (staging, daarna productie), in één sessie,
-- van boven naar beneden. Idempotent: tweede run verwijdert 0 rijen als al schoon.
--
-- Achtergrond:
--   Vóór de deleteTask-appfix werd bij taak-verwijderen task_id op NULL gezet
--   (ON DELETE SET NULL). Die uitgaven bleven in budget/rapporten meetellen.
--
-- Wat wordt verwijderd (STAP 3):
--   project_expenses met task_id IS NULL én (geen spent_on OF lege title).
--   = typische restanten na de bug, geen bewust ingevoerde losse posten.
--
-- Wat NIET automatisch wordt verwijderd:
--   Rijen mét omschrijving én datum (STAP 2b) — kan bewust losse uitgave zijn.
--   Verwijder die alleen handmatig als je zeker weet dat het wees is.
--
-- expense_documents: CASCADE bij DELETE op project_expenses.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STAP 0 — Schema-controle (geen wijziging)
-- -----------------------------------------------------------------------------
SELECT
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'project_expenses'
  ) AS has_project_expenses,
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_expenses'
      AND column_name = 'task_id'
  ) AS has_task_id_column;

-- -----------------------------------------------------------------------------
-- STAP 1 — Aantallen vóór cleanup
-- -----------------------------------------------------------------------------
SELECT count(*) AS voor_cleanup__alle_zonder_task_id
FROM public.project_expenses
WHERE task_id IS NULL;

SELECT count(*) AS voor_cleanup__wees_kandidaten_automatisch
FROM public.project_expenses pe
WHERE pe.task_id IS NULL
  AND (
    pe.spent_on IS NULL
    OR length(trim(coalesce(pe.title, ''))) = 0
  );

SELECT count(*) AS voor_cleanup__handmatige_controle_niet_automatisch
FROM public.project_expenses pe
WHERE pe.task_id IS NULL
  AND pe.spent_on IS NOT NULL
  AND length(trim(coalesce(pe.title, ''))) > 0;

-- -----------------------------------------------------------------------------
-- STAP 2 — Preview (wordt verwijderd in STAP 3)
-- -----------------------------------------------------------------------------
SELECT
  pe.id,
  pe.project_id,
  p.name AS project_name,
  pe.title,
  pe.amount,
  pe.spent_on,
  pe.notes,
  pe.created_at,
  pe.funded_by_construction_depot
FROM public.project_expenses pe
JOIN public.projects p ON p.id = pe.project_id
WHERE pe.task_id IS NULL
  AND (
    pe.spent_on IS NULL
    OR length(trim(coalesce(pe.title, ''))) = 0
  )
ORDER BY pe.created_at DESC;

-- -----------------------------------------------------------------------------
-- STAP 2b — Blijft staan (handmatige controle indien nodig)
-- -----------------------------------------------------------------------------
SELECT
  pe.id,
  pe.project_id,
  p.name AS project_name,
  pe.title,
  pe.amount,
  pe.spent_on,
  pe.notes,
  pe.created_at
FROM public.project_expenses pe
JOIN public.projects p ON p.id = pe.project_id
WHERE pe.task_id IS NULL
  AND pe.spent_on IS NOT NULL
  AND length(trim(coalesce(pe.title, ''))) > 0
ORDER BY pe.created_at DESC;

-- -----------------------------------------------------------------------------
-- STAP 3 — Cleanup (automatisch)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_candidates bigint;
  v_deleted bigint;
  v_remaining_null bigint;
  v_remaining_manual bigint;
BEGIN
  SELECT count(*) INTO v_candidates
  FROM public.project_expenses pe
  WHERE pe.task_id IS NULL
    AND (
      pe.spent_on IS NULL
      OR length(trim(coalesce(pe.title, ''))) = 0
    );

  RAISE NOTICE 'STAP 3: % wees-kandidaat(en) worden verwijderd', v_candidates;

  DELETE FROM public.project_expenses pe
  WHERE pe.task_id IS NULL
    AND (
      pe.spent_on IS NULL
      OR length(trim(coalesce(pe.title, ''))) = 0
    );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'STAP 3: % rij(en) verwijderd', v_deleted;

  SELECT count(*) INTO v_remaining_null
  FROM public.project_expenses
  WHERE task_id IS NULL;

  SELECT count(*) INTO v_remaining_manual
  FROM public.project_expenses pe
  WHERE pe.task_id IS NULL
    AND pe.spent_on IS NOT NULL
    AND length(trim(coalesce(pe.title, ''))) > 0;

  RAISE NOTICE 'Na cleanup: % uitgave(n) nog zonder task_id (waarvan % alleen handmatige controle)', v_remaining_null, v_remaining_manual;
END $$;

-- -----------------------------------------------------------------------------
-- STAP 4 — Verificatie na cleanup
-- -----------------------------------------------------------------------------
SELECT count(*) AS na_cleanup__alle_zonder_task_id
FROM public.project_expenses
WHERE task_id IS NULL;

SELECT count(*) AS na_cleanup__wees_kandidaten_automatisch
FROM public.project_expenses pe
WHERE pe.task_id IS NULL
  AND (
    pe.spent_on IS NULL
    OR length(trim(coalesce(pe.title, ''))) = 0
  );

-- Optioneel: specifieke ids uit STAP 2b (alleen na handmatige review)
-- DELETE FROM public.project_expenses
-- WHERE id IN ('uuid-hier'::uuid);
