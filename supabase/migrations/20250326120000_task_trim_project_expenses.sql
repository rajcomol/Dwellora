-- Verwijder taakvelden categorie en fase; voeg losse projectuitgaven toe (bouwmarkt e.d.).

ALTER TABLE public.tasks DROP COLUMN IF EXISTS category;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS phase;

CREATE TABLE IF NOT EXISTS public.project_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  spent_on date,
  notes text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS project_expenses_project_id_idx
  ON public.project_expenses (project_id, created_at DESC);

ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_expenses_select" ON public.project_expenses;
DROP POLICY IF EXISTS "project_expenses_insert" ON public.project_expenses;
DROP POLICY IF EXISTS "project_expenses_update" ON public.project_expenses;
DROP POLICY IF EXISTS "project_expenses_delete" ON public.project_expenses;

CREATE POLICY "project_expenses_select" ON public.project_expenses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_expenses.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "project_expenses_insert" ON public.project_expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_expenses.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "project_expenses_update" ON public.project_expenses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_expenses.project_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_expenses.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "project_expenses_delete" ON public.project_expenses
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_expenses.project_id AND p.user_id = auth.uid()
    )
  );
