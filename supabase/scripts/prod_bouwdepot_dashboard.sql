-- =============================================================================
-- PROD: Bouwdepot-herbouw + losse uitgaven depot-vlag
-- =============================================================================
-- Uitvoeren in Supabase SQL Editor (productie), in één sessie, boven naar beneden.
--
-- VOLGORDE (verplicht):
--   STAP 0  Controleer voorgaande schema (eenmalig op prod)
--   STAP 1  Bouwdepot: één depot per project (vervangt construction_depots-tabel)
--   STAP 2  Losse uitgaven: funded_by_construction_depot
--
-- VOORWAARDEN (moeten al op prod staan vóór STAP 1):
--   - public.projects.construction_depot_total  (migratie 20250601120000)
--   - public.projects.own_contribution          (migratie 20250601120000)
--   - public.tasks.project_id, actual_cost     (migratie 20250522120000 e.d.)
--   - public.project_expenses                   (basis-schema)
--
-- Als STAP 1 eerder deels is mislukt (view al gedropt, kolom nog niet):
--   Dit script is grotendeels idempotent (IF NOT EXISTS / IF EXISTS).
--   De backfill UPDATE draait alleen als construction_depot_id nog bestaat.
--
-- Na STAP 1 verdwijnen:
--   - public.construction_depots
--   - public.construction_depot_balances (oude view)
-- Nieuwe view: public.project_construction_depot_balances
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STAP 0 — Snelle controle (resultaat lezen, geen wijziging)
-- -----------------------------------------------------------------------------
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'construction_depot_total'
  ) AS has_project_depot_total,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'construction_depots'
  ) AS has_old_construction_depots_table,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'construction_depot_id'
  ) AS has_tasks_construction_depot_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'funded_by_construction_depot'
  ) AS has_tasks_funded_flag,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_expenses' AND column_name = 'funded_by_construction_depot'
  ) AS has_expenses_funded_flag;

-- Stop hier als has_project_depot_total = false.
-- Voer dan eerst uit: supabase/migrations/20250601120000_project_budget_split.sql

-- =============================================================================
-- STAP 1 — Bouwdepot: één financieringsbron per project
-- (bestand: migrations/20250624120000_bouwdepot_one_per_project.sql)
-- =============================================================================

-- 1a. Views/tabel die tasks.construction_depot_id gebruiken — EERST droppen
DROP VIEW IF EXISTS public.construction_depot_balances;

-- 1b. Nieuwe taak-kolom
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS funded_by_construction_depot boolean NOT NULL DEFAULT false;

-- 1c. Backfill alleen als legacy-kolom nog bestaat
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'construction_depot_id'
  ) THEN
    UPDATE public.tasks
    SET funded_by_construction_depot = true
    WHERE construction_depot_id IS NOT NULL;
  END IF;
END $$;

-- 1d. Oude trigger/functie en FK
DROP TRIGGER IF EXISTS tasks_construction_depot_project_trg ON public.tasks;
DROP FUNCTION IF EXISTS public.tasks_construction_depot_matches_project();

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_construction_depot_id_fkey;

DROP INDEX IF EXISTS public.tasks_construction_depot_id_idx;

ALTER TABLE public.tasks
  DROP COLUMN IF EXISTS construction_depot_id;

-- 1e. Oude depots-tabel (pas na FK/kolom weg)
DROP TABLE IF EXISTS public.construction_depots;

CREATE INDEX IF NOT EXISTS tasks_funded_by_construction_depot_idx
  ON public.tasks (project_id)
  WHERE funded_by_construction_depot = true;

COMMENT ON COLUMN public.tasks.funded_by_construction_depot IS
  'Taakkosten tellen mee voor het project-bouwdepot (financieringsbron, geen uitgave).';

-- 1f. Nieuwe saldo-view (één rij per project)
DROP VIEW IF EXISTS public.project_construction_depot_balances;

CREATE VIEW public.project_construction_depot_balances
WITH (security_invoker = true)
AS
SELECT
  p.id AS project_id,
  COALESCE(p.construction_depot_total, 0) AS total_amount,
  COALESCE(
    SUM(
      CASE
        WHEN t.funded_by_construction_depot THEN
          COALESCE(NULLIF(t.actual_cost, 0), t.estimated_cost, 0)
        ELSE 0
      END
    ),
    0
  ) AS used_amount,
  COALESCE(p.construction_depot_total, 0)
    - COALESCE(
        SUM(
          CASE
            WHEN t.funded_by_construction_depot THEN
              COALESCE(NULLIF(t.actual_cost, 0), t.estimated_cost, 0)
            ELSE 0
          END
        ),
        0
      ) AS remaining_amount,
  CASE
    WHEN COALESCE(p.construction_depot_total, 0) > 0 THEN
      (
        COALESCE(
          SUM(
            CASE
              WHEN t.funded_by_construction_depot THEN
                COALESCE(NULLIF(t.actual_cost, 0), t.estimated_cost, 0)
              ELSE 0
            END
          ),
          0
        ) / p.construction_depot_total
      ) * 100
    ELSE 0
  END AS percentage_used,
  COUNT(t.id) FILTER (WHERE t.funded_by_construction_depot)::int AS linked_task_count
FROM public.projects p
LEFT JOIN public.tasks t ON t.project_id = p.id
GROUP BY p.id, p.construction_depot_total;

GRANT SELECT ON public.project_construction_depot_balances TO authenticated;

COMMENT ON VIEW public.project_construction_depot_balances IS
  'Bouwdepot per project: totaal, gebruikt (werkelijk of geschat per gekoppelde taak), resterend.';

-- =============================================================================
-- STAP 2 — Losse uitgaven: declareren uit bouwdepot
-- (bestand: migrations/20250625120000_project_expenses_depot_flag.sql)
-- =============================================================================

ALTER TABLE public.project_expenses
  ADD COLUMN IF NOT EXISTS funded_by_construction_depot boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.project_expenses.funded_by_construction_depot IS
  'Uitgave telt mee voor het project-bouwdepot.';

-- -----------------------------------------------------------------------------
-- STAP 3 — Verificatie na uitvoeren (verwacht: alles true behalve oude tabel/kolom)
-- -----------------------------------------------------------------------------
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'funded_by_construction_depot'
  ) AS tasks_funded_ok,
  EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'project_construction_depot_balances'
  ) AS view_ok,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_expenses' AND column_name = 'funded_by_construction_depot'
  ) AS expenses_funded_ok,
  NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'construction_depots'
  ) AS old_depots_table_gone;
