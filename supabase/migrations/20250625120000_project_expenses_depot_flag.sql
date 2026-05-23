-- Losse uitgaven kunnen tegen het bouwdepot worden gedeclareerd.

ALTER TABLE public.project_expenses
  ADD COLUMN IF NOT EXISTS funded_by_construction_depot boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.project_expenses.funded_by_construction_depot IS
  'Uitgave telt mee voor het project-bouwdepot.';
