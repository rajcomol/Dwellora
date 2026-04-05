-- Expense documents (receipts/invoices) + optional task link on project_expenses.
-- Private bucket expense_documents (path: {project_id}/expenses/{expense_id}/...).

-- ---------------------------------------------------------------------------
-- project_expenses: optional task (must belong to same project)
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_expenses
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS project_expenses_task_id_idx
  ON public.project_expenses (task_id)
  WHERE task_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.project_expenses_task_matches_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.task_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.rooms r ON r.id = t.room_id
    WHERE t.id = NEW.task_id
      AND r.project_id = NEW.project_id
  ) THEN
    RAISE EXCEPTION 'project_expenses.task_id must reference a task in the same project';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_expenses_task_project_trg ON public.project_expenses;
CREATE TRIGGER project_expenses_task_project_trg
  BEFORE INSERT OR UPDATE OF task_id, project_id ON public.project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.project_expenses_task_matches_project();

-- ---------------------------------------------------------------------------
-- expense_documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.project_expenses (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('receipt', 'invoice', 'other')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime_type text NOT NULL DEFAULT '',
  file_size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz,
  extracted_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION public.expense_documents_validate_expense_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pid uuid;
BEGIN
  SELECT pe.project_id INTO v_pid
  FROM public.project_expenses pe
  WHERE pe.id = NEW.expense_id;

  IF v_pid IS NULL THEN
    RAISE EXCEPTION 'expense_documents.expense_id not found';
  END IF;
  IF v_pid <> NEW.project_id THEN
    RAISE EXCEPTION 'expense_documents.project_id must match expense project';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS expense_documents_validate_expense_trg ON public.expense_documents;
CREATE TRIGGER expense_documents_validate_expense_trg
  BEFORE INSERT OR UPDATE OF expense_id, project_id ON public.expense_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.expense_documents_validate_expense_project();

CREATE OR REPLACE FUNCTION public.expense_documents_set_uploaded_by()
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

DROP TRIGGER IF EXISTS expense_documents_set_uploaded_by_trg ON public.expense_documents;
CREATE TRIGGER expense_documents_set_uploaded_by_trg
  BEFORE INSERT ON public.expense_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.expense_documents_set_uploaded_by();

CREATE INDEX IF NOT EXISTS expense_documents_project_uploaded_idx
  ON public.expense_documents (project_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS expense_documents_expense_id_idx
  ON public.expense_documents (expense_id);

ALTER TABLE public.expense_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expense_documents_select" ON public.expense_documents;
DROP POLICY IF EXISTS "expense_documents_insert" ON public.expense_documents;
DROP POLICY IF EXISTS "expense_documents_update" ON public.expense_documents;
DROP POLICY IF EXISTS "expense_documents_delete" ON public.expense_documents;

CREATE POLICY "expense_documents_select" ON public.expense_documents
  FOR SELECT TO authenticated
  USING (public.user_has_project_access(expense_documents.project_id));

CREATE POLICY "expense_documents_insert" ON public.expense_documents
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_project_access(expense_documents.project_id));

CREATE POLICY "expense_documents_update" ON public.expense_documents
  FOR UPDATE TO authenticated
  USING (public.user_has_project_access(expense_documents.project_id))
  WITH CHECK (public.user_has_project_access(expense_documents.project_id));

CREATE POLICY "expense_documents_delete" ON public.expense_documents
  FOR DELETE TO authenticated
  USING (public.user_has_project_access(expense_documents.project_id));

COMMENT ON TABLE public.expense_documents IS 'Receipts/invoices linked to project expenses; not quote PDFs.';
COMMENT ON COLUMN public.expense_documents.extracted_metadata IS 'OCR/AI: vendor, document_date, total_amount, etc.';

-- ---------------------------------------------------------------------------
-- Storage: bucket expense_documents (private)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense_documents', 'expense_documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "expense_documents_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "expense_documents_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "expense_documents_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "expense_documents_storage_delete" ON storage.objects;

CREATE POLICY "expense_documents_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'expense_documents'
    AND public.user_has_project_access(split_part(name, '/', 1)::uuid)
  );

CREATE POLICY "expense_documents_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'expense_documents'
    AND public.user_has_project_access(split_part(name, '/', 1)::uuid)
  );

CREATE POLICY "expense_documents_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'expense_documents'
    AND public.user_has_project_access(split_part(name, '/', 1)::uuid)
  )
  WITH CHECK (
    bucket_id = 'expense_documents'
    AND public.user_has_project_access(split_part(name, '/', 1)::uuid)
  );

CREATE POLICY "expense_documents_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'expense_documents'
    AND public.user_has_project_access(split_part(name, '/', 1)::uuid)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_documents TO authenticated;
