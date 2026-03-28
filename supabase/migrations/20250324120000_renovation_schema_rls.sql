-- Renovation app: core tables, user_id on projects, RLS, storage policies for bucket `documents`.
-- Apply via Supabase SQL editor or `supabase db push` / linked project.

-- ---------------------------------------------------------------------------
-- Tables (idempotent for existing projects)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  total_budget numeric NOT NULL DEFAULT 0
);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE public.projects
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  room_id uuid NOT NULL REFERENCES public.rooms (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'todo',
  estimated_cost numeric NOT NULL DEFAULT 0,
  duration_days numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'General',
  priority text NOT NULL DEFAULT 'medium',
  phase text NOT NULL DEFAULT 'Execution'
);

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL
);

-- Optional: enforce ownership on every project row after backfilling user_id:
-- DELETE FROM public.documents WHERE project_id IN (SELECT id FROM public.projects WHERE user_id IS NULL);
-- DELETE FROM public.tasks WHERE room_id IN (SELECT id FROM public.rooms WHERE project_id IN (SELECT id FROM public.projects WHERE user_id IS NULL));
-- DELETE FROM public.rooms WHERE project_id IN (SELECT id FROM public.projects WHERE user_id IS NULL);
-- DELETE FROM public.projects WHERE user_id IS NULL;
-- ALTER TABLE public.projects ALTER COLUMN user_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;

CREATE POLICY "projects_select_own" ON public.projects
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "projects_insert_own" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_update_own" ON public.projects
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_delete_own" ON public.projects
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "rooms_select_via_project" ON public.rooms;
DROP POLICY IF EXISTS "rooms_insert_via_project" ON public.rooms;
DROP POLICY IF EXISTS "rooms_update_via_project" ON public.rooms;
DROP POLICY IF EXISTS "rooms_delete_via_project" ON public.rooms;

CREATE POLICY "rooms_select_via_project" ON public.rooms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = rooms.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "rooms_insert_via_project" ON public.rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = rooms.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "rooms_update_via_project" ON public.rooms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = rooms.project_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = rooms.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "rooms_delete_via_project" ON public.rooms
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = rooms.project_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tasks_select_via_room" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_via_room" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_via_room" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_via_room" ON public.tasks;

CREATE POLICY "tasks_select_via_room" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.projects p ON p.id = r.project_id
      WHERE r.id = tasks.room_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_insert_via_room" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.projects p ON p.id = r.project_id
      WHERE r.id = tasks.room_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_update_via_room" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.projects p ON p.id = r.project_id
      WHERE r.id = tasks.room_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.projects p ON p.id = r.project_id
      WHERE r.id = tasks.room_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_delete_via_room" ON public.tasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.projects p ON p.id = r.project_id
      WHERE r.id = tasks.room_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "documents_select_via_project" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_via_project" ON public.documents;
DROP POLICY IF EXISTS "documents_update_via_project" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_via_project" ON public.documents;

CREATE POLICY "documents_select_via_project" ON public.documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = documents.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "documents_insert_via_project" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = documents.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "documents_update_via_project" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = documents.project_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = documents.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "documents_delete_via_project" ON public.documents
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = documents.project_id AND p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: private bucket + policies (object path: {project_id}/{filename})
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE SET public = excluded.public;

DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_delete" ON storage.objects;

CREATE POLICY "documents_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "documents_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "documents_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "documents_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = split_part(name, '/', 1)
        AND p.user_id = auth.uid()
    )
  );
