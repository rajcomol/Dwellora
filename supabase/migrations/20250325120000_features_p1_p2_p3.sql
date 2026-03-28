-- P1: project metadata, task actuals & planning fields, document summaries for chat context
-- P3: task dependencies, task attachments, key handover checklist, lightweight team roster

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expected_key_handover date,
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS actual_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_date date;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS ai_summary text;

-- ---------------------------------------------------------------------------
-- Chat persistence (optional feature)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Chat'
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_messages_thread_id_created_at_idx
  ON public.chat_messages (thread_id, created_at);

CREATE INDEX IF NOT EXISTS chat_threads_user_id_updated_at_idx
  ON public.chat_threads (user_id, updated_at DESC);

-- ---------------------------------------------------------------------------
-- Task dependencies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  UNIQUE (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS task_dependencies_task_id_idx ON public.task_dependencies (task_id);

-- ---------------------------------------------------------------------------
-- Task attachments (storage path: {project_id}/tasks/{task_id}/{filename})
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL
);

CREATE INDEX IF NOT EXISTS task_attachments_task_id_idx ON public.task_attachments (task_id);

-- ---------------------------------------------------------------------------
-- Key handover checklist (per project)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.key_handover_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  title text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS key_handover_checklist_project_idx
  ON public.key_handover_checklist_items (project_id, sort_order);

-- ---------------------------------------------------------------------------
-- Team roster (owner-managed; no auth invite flow)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_team_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role_hint text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS project_team_roster_project_idx
  ON public.project_team_roster (project_id, sort_order);

-- ---------------------------------------------------------------------------
-- RLS: chat
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_threads_select_own" ON public.chat_threads;
DROP POLICY IF EXISTS "chat_threads_insert_own" ON public.chat_threads;
DROP POLICY IF EXISTS "chat_threads_update_own" ON public.chat_threads;
DROP POLICY IF EXISTS "chat_threads_delete_own" ON public.chat_threads;

CREATE POLICY "chat_threads_select_own" ON public.chat_threads
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "chat_threads_insert_own" ON public.chat_threads
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_threads_update_own" ON public.chat_threads
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_threads_delete_own" ON public.chat_threads
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "chat_messages_select_via_thread" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_via_thread" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete_via_thread" ON public.chat_messages;

CREATE POLICY "chat_messages_select_via_thread" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = chat_messages.thread_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_insert_via_thread" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_threads th
      WHERE th.id = chat_messages.thread_id AND th.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_delete_via_thread" ON public.chat_messages
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = chat_messages.thread_id AND t.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: task_dependencies (via task -> room -> project)
-- ---------------------------------------------------------------------------
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_deps_select" ON public.task_dependencies;
DROP POLICY IF EXISTS "task_deps_insert" ON public.task_dependencies;
DROP POLICY IF EXISTS "task_deps_delete" ON public.task_dependencies;

CREATE POLICY "task_deps_select" ON public.task_dependencies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.rooms r ON r.id = t.room_id
      JOIN public.projects p ON p.id = r.project_id
      WHERE t.id = task_dependencies.task_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "task_deps_insert" ON public.task_dependencies
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.rooms r ON r.id = t.room_id
      JOIN public.projects p ON p.id = r.project_id
      WHERE t.id = task_dependencies.task_id AND p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.tasks t2
      JOIN public.rooms r2 ON r2.id = t2.room_id
      JOIN public.projects p2 ON p2.id = r2.project_id
      WHERE t2.id = task_dependencies.depends_on_task_id AND p2.user_id = auth.uid()
    )
  );

CREATE POLICY "task_deps_delete" ON public.task_dependencies
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.rooms r ON r.id = t.room_id
      JOIN public.projects p ON p.id = r.project_id
      WHERE t.id = task_dependencies.task_id AND p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: task_attachments
-- ---------------------------------------------------------------------------
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_attachments_select" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_insert" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_delete" ON public.task_attachments;

CREATE POLICY "task_attachments_select" ON public.task_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.rooms r ON r.id = t.room_id
      JOIN public.projects p ON p.id = r.project_id
      WHERE t.id = task_attachments.task_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "task_attachments_insert" ON public.task_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.rooms r ON r.id = t.room_id
      JOIN public.projects p ON p.id = r.project_id
      WHERE t.id = task_attachments.task_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "task_attachments_delete" ON public.task_attachments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.rooms r ON r.id = t.room_id
      JOIN public.projects p ON p.id = r.project_id
      WHERE t.id = task_attachments.task_id AND p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: key_handover_checklist_items
-- ---------------------------------------------------------------------------
ALTER TABLE public.key_handover_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist_select" ON public.key_handover_checklist_items;
DROP POLICY IF EXISTS "checklist_insert" ON public.key_handover_checklist_items;
DROP POLICY IF EXISTS "checklist_update" ON public.key_handover_checklist_items;
DROP POLICY IF EXISTS "checklist_delete" ON public.key_handover_checklist_items;

CREATE POLICY "checklist_select" ON public.key_handover_checklist_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = key_handover_checklist_items.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "checklist_insert" ON public.key_handover_checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = key_handover_checklist_items.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "checklist_update" ON public.key_handover_checklist_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = key_handover_checklist_items.project_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = key_handover_checklist_items.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "checklist_delete" ON public.key_handover_checklist_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = key_handover_checklist_items.project_id AND p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: project_team_roster
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_team_roster ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roster_select" ON public.project_team_roster;
DROP POLICY IF EXISTS "roster_insert" ON public.project_team_roster;
DROP POLICY IF EXISTS "roster_update" ON public.project_team_roster;
DROP POLICY IF EXISTS "roster_delete" ON public.project_team_roster;

CREATE POLICY "roster_select" ON public.project_team_roster
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_roster.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "roster_insert" ON public.project_team_roster
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_roster.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "roster_update" ON public.project_team_roster
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_roster.project_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_roster.project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "roster_delete" ON public.project_team_roster
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team_roster.project_id AND p.user_id = auth.uid()
    )
  );
