-- Drop unused bouwdepot_declaraties table (replaced by bouwdepot kostenposten on project_expenses).
-- Backup before apply: npm run export:bouwdepot-declaraties

DROP TRIGGER IF EXISTS bouwdepot_declaraties_bijgewerkt_op ON public.bouwdepot_declaraties;
DROP POLICY IF EXISTS "Gebruiker ziet eigen declaraties" ON public.bouwdepot_declaraties;
DROP TABLE IF EXISTS public.bouwdepot_declaraties;
DROP FUNCTION IF EXISTS public.set_bouwdepot_declaraties_bijgewerkt_op();
