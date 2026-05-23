-- Bouwdepot: één financieringsbron per project (projects.construction_depot_total).
-- Taken koppelen via funded_by_construction_depot; geen aparte depots-tabel meer.

-- ---------------------------------------------------------------------------
-- Eerst view die construction_depot_id gebruikt
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.construction_depot_balances;

-- ---------------------------------------------------------------------------
-- tasks: boolean koppeling i.p.v. construction_depot_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS funded_by_construction_depot boolean NOT NULL DEFAULT false;

UPDATE public.tasks
SET funded_by_construction_depot = true
WHERE construction_depot_id IS NOT NULL;

DROP TRIGGER IF EXISTS tasks_construction_depot_project_trg ON public.tasks;
DROP FUNCTION IF EXISTS public.tasks_construction_depot_matches_project();

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_construction_depot_id_fkey;

DROP INDEX IF EXISTS public.tasks_construction_depot_id_idx;

ALTER TABLE public.tasks
  DROP COLUMN IF EXISTS construction_depot_id;

DROP TABLE IF EXISTS public.construction_depots;

CREATE INDEX IF NOT EXISTS tasks_funded_by_construction_depot_idx
  ON public.tasks (project_id)
  WHERE funded_by_construction_depot = true;

COMMENT ON COLUMN public.tasks.funded_by_construction_depot IS
  'Taakkosten tellen mee voor het project-bouwdepot (financieringsbron, geen uitgave).';

-- ---------------------------------------------------------------------------
-- Project-bouwdepot saldo (één rij per project)
-- Gebruikt: COALESCE(werkelijke kosten, geschatte kosten) per gekoppelde taak
-- ---------------------------------------------------------------------------
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
