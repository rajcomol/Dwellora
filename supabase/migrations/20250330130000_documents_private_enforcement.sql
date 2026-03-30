-- Enforce private document storage and record who uploaded each file.
-- Files remain readable only via RLS: project owner or accepted collaborator (user_has_project_access).

-- 1) Bucket must never be public (direct URLs without auth must not work).
UPDATE storage.buckets
SET public = false
WHERE id = 'documents';

-- 2) Audit column: uploader (defaults via trigger).
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

UPDATE public.documents d
SET uploaded_by = p.user_id
FROM public.projects p
WHERE d.project_id = p.id
  AND d.uploaded_by IS NULL;

CREATE OR REPLACE FUNCTION public.documents_set_uploaded_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.uploaded_by IS NULL THEN
    NEW.uploaded_by := (SELECT auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documents_set_uploaded_by_trg ON public.documents;
CREATE TRIGGER documents_set_uploaded_by_trg
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.documents_set_uploaded_by();

-- 3) RLS applies even for table owner connections (defense in depth).
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.documents.uploaded_by IS 'User who uploaded the file; access still governed by project RLS (owner + collaborator).';
