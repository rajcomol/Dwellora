-- 3D Kamerplanner: per-project room planners met opgeslagen kamer- en AI-analyse data.

CREATE TABLE public.kamer_planners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id)
    ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id)
    ON DELETE CASCADE NOT NULL,
  naam text NOT NULL DEFAULT 'Nieuwe kamer',
  kamer_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_analyse jsonb NOT NULL DEFAULT '{}'::jsonb,
  aangemaakt_op timestamptz DEFAULT now(),
  bijgewerkt_op timestamptz DEFAULT now()
);

CREATE INDEX kamer_planners_project_id_idx
  ON public.kamer_planners (project_id);

CREATE INDEX kamer_planners_user_id_idx
  ON public.kamer_planners (user_id);

CREATE OR REPLACE FUNCTION public.set_kamer_planners_bijgewerkt_op()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.bijgewerkt_op = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER kamer_planners_bijgewerkt_op
  BEFORE UPDATE ON public.kamer_planners
  FOR EACH ROW
  EXECUTE FUNCTION public.set_kamer_planners_bijgewerkt_op();

ALTER TABLE public.kamer_planners
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gebruiker ziet eigen planners"
  ON public.kamer_planners
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
