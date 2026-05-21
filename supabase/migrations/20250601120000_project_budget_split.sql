-- Project budget split: own_contribution + construction_depot_total; depot view uses project cap.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS own_contribution numeric,
  ADD COLUMN IF NOT EXISTS construction_depot_total numeric;

COMMENT ON COLUMN public.projects.own_contribution IS 'Eigen inbreng (eigen geld).';
COMMENT ON COLUMN public.projects.construction_depot_total IS 'Totaal bouwdepot-budget op projectniveau (niet per depot).';

-- Backfill: treat existing total_budget as own money when new columns are empty
UPDATE public.projects
SET own_contribution = total_budget
WHERE own_contribution IS NULL
  AND construction_depot_total IS NULL
  AND total_budget > 0;

-- construction_depots.total_amount is legacy; budget cap is projects.construction_depot_total
-- DROP required: CREATE OR REPLACE cannot add/reorder view columns (Postgres 42P16).
DROP VIEW IF EXISTS public.construction_depot_balances;

CREATE VIEW public.construction_depot_balances
WITH (security_invoker = true)
AS
SELECT
  d.id,
  d.project_id,
  d.name,
  d.total_amount,
  d.created_at,
  d.user_id,
  COALESCE(SUM(t.estimated_cost), 0) AS spent_estimated,
  COALESCE(p.construction_depot_total, 0) AS project_depot_total,
  GREATEST(
    0,
    COALESCE(p.construction_depot_total, 0) - COALESCE(proj_spent.total_spent, 0)
  ) AS remaining_estimated,
  CASE
    WHEN COALESCE(p.construction_depot_total, 0) > 0 THEN
      (COALESCE(SUM(t.estimated_cost), 0) / p.construction_depot_total) * 100
    ELSE 0
  END AS percentage_used,
  COUNT(t.id)::int AS linked_task_count
FROM public.construction_depots d
JOIN public.projects p ON p.id = d.project_id
LEFT JOIN public.tasks t ON t.construction_depot_id = d.id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(t2.estimated_cost), 0) AS total_spent
  FROM public.tasks t2
  WHERE t2.construction_depot_id IN (
    SELECT d2.id FROM public.construction_depots d2 WHERE d2.project_id = d.project_id
  )
) proj_spent ON true
GROUP BY d.id, p.construction_depot_total, proj_spent.total_spent;

GRANT SELECT ON public.construction_depot_balances TO authenticated;
