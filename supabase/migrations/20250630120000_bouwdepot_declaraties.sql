-- Bouwdepot declaraties: bankreimbursement flow per project.

CREATE TABLE public.bouwdepot_declaraties (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id)
    ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id)
    ON DELETE CASCADE NOT NULL,
  omschrijving text NOT NULL,
  bedrag numeric NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'ingediend', 'uitbetaling_verwacht', 'uitbetaald')),
  ingediend_op date,
  uitbetaald_op date,
  taak_id uuid REFERENCES public.tasks(id)
    ON DELETE SET NULL,
  notities text,
  aangemaakt_op timestamptz DEFAULT now(),
  bijgewerkt_op timestamptz DEFAULT now()
);

CREATE INDEX bouwdepot_declaraties_project_id_idx
  ON public.bouwdepot_declaraties (project_id);

CREATE INDEX bouwdepot_declaraties_user_id_idx
  ON public.bouwdepot_declaraties (user_id);

CREATE OR REPLACE FUNCTION public.set_bouwdepot_declaraties_bijgewerkt_op()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.bijgewerkt_op = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER bouwdepot_declaraties_bijgewerkt_op
  BEFORE UPDATE ON public.bouwdepot_declaraties
  FOR EACH ROW
  EXECUTE FUNCTION public.set_bouwdepot_declaraties_bijgewerkt_op();

ALTER TABLE public.bouwdepot_declaraties
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gebruiker ziet eigen declaraties"
  ON public.bouwdepot_declaraties
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
