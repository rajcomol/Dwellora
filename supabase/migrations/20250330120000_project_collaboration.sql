-- Project collaboration: one optional collaborator per project, invites, RLS updates.
-- Requires pgcrypto for token hashing (Supabase includes it).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables (must exist before functions that reference them)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

-- At most one collaborator row per project (single extra member).
CREATE UNIQUE INDEX IF NOT EXISTS project_members_one_row_per_project
  ON public.project_members (project_id);

CREATE TABLE IF NOT EXISTS public.project_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  email text NOT NULL,
  token_hash text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'cancelled')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT project_invites_token_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS project_invites_project_id_idx ON public.project_invites (project_id);

CREATE UNIQUE INDEX IF NOT EXISTS project_invites_one_pending_per_project
  ON public.project_invites (project_id)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS project_invites_pending_email_per_project
  ON public.project_invites (project_id, email)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- Access helpers (SECURITY INVOKER: respect caller's auth.uid())
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_project_access(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = pid
      AND (
        p.user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.project_members m
          WHERE m.project_id = p.id
            AND m.user_id = (SELECT auth.uid())
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = pid
      AND p.user_id = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_project_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Accept invite (SECURITY DEFINER: inserts membership; RLS does not allow direct insert)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_project_invite(p_plain_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.project_invites%ROWTYPE;
  v_hash text;
  v_jwt_email text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  v_hash := encode(digest(trim(p_plain_token), 'sha256'), 'hex');

  SELECT * INTO v_inv
  FROM public.project_invites
  WHERE token_hash = v_hash
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  END IF;

  IF v_inv.expires_at < now() THEN
    UPDATE public.project_invites
    SET status = 'cancelled'
    WHERE id = v_inv.id;
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  v_jwt_email := lower(trim(COALESCE((auth.jwt() ->> 'email')::text, '')));
  IF v_jwt_email = '' OR v_jwt_email <> v_inv.email THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_mismatch');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = v_inv.project_id
      AND user_id = (SELECT auth.uid())
  ) THEN
    RETURN jsonb_build_object('ok', true, 'project_id', v_inv.project_id);
  END IF;

  IF EXISTS (SELECT 1 FROM public.project_members WHERE project_id = v_inv.project_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_has_member');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = v_inv.project_id AND p.user_id = (SELECT auth.uid())
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'owner_cannot_accept_own_invite');
  END IF;

  INSERT INTO public.project_members (project_id, user_id)
  VALUES (v_inv.project_id, (SELECT auth.uid()));

  UPDATE public.project_invites
  SET
    status = 'accepted',
    accepted_at = now(),
    accepted_user_id = (SELECT auth.uid())
  WHERE id = v_inv.id;

  RETURN jsonb_build_object('ok', true, 'project_id', v_inv.project_id);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_project_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_project_invite(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: new tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_project_owner(project_members.project_id)
  );

-- No INSERT/UPDATE/DELETE for authenticated — only via accept_project_invite or cascades.

DROP POLICY IF EXISTS "project_invites_select_owner" ON public.project_invites;
CREATE POLICY "project_invites_select_owner" ON public.project_invites
  FOR SELECT TO authenticated
  USING (public.is_project_owner(project_invites.project_id));

DROP POLICY IF EXISTS "project_invites_insert_owner" ON public.project_invites;
CREATE POLICY "project_invites_insert_owner" ON public.project_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_project_owner(project_invites.project_id)
    AND invited_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "project_invites_update_owner" ON public.project_invites;
CREATE POLICY "project_invites_update_owner" ON public.project_invites
  FOR UPDATE TO authenticated
  USING (public.is_project_owner(project_invites.project_id))
  WITH CHECK (public.is_project_owner(project_invites.project_id));

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;

CREATE POLICY "projects_select_access" ON public.projects
  FOR SELECT TO authenticated
  USING (public.user_has_project_access(projects.id));

CREATE POLICY "projects_insert_own" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "projects_update_access" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.user_has_project_access(projects.id))
  WITH CHECK (public.user_has_project_access(projects.id));

CREATE POLICY "projects_delete_owner" ON public.projects
  FOR DELETE TO authenticated
  USING (public.is_project_owner(projects.id));

-- ---------------------------------------------------------------------------
-- rooms
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "rooms_select_via_project" ON public.rooms;
DROP POLICY IF EXISTS "rooms_insert_via_project" ON public.rooms;
DROP POLICY IF EXISTS "rooms_update_via_project" ON public.rooms;
DROP POLICY IF EXISTS "rooms_delete_via_project" ON public.rooms;

CREATE POLICY "rooms_select_via_project" ON public.rooms
  FOR SELECT TO authenticated
  USING (public.user_has_project_access(rooms.project_id));

CREATE POLICY "rooms_insert_via_project" ON public.rooms
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_project_access(rooms.project_id));

CREATE POLICY "rooms_update_via_project" ON public.rooms
  FOR UPDATE TO authenticated
  USING (public.user_has_project_access(rooms.project_id))
  WITH CHECK (public.user_has_project_access(rooms.project_id));

CREATE POLICY "rooms_delete_via_project" ON public.rooms
  FOR DELETE TO authenticated
  USING (public.user_has_project_access(rooms.project_id));

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
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
      WHERE r.id = tasks.room_id
        AND public.user_has_project_access(p.id)
    )
  );

CREATE POLICY "tasks_insert_via_room" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.projects p ON p.id = r.project_id
      WHERE r.id = tasks.room_id
        AND public.user_has_project_access(p.id)
    )
  );

CREATE POLICY "tasks_update_via_room" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.projects p ON p.id = r.project_id
      WHERE r.id = tasks.room_id
        AND public.user_has_project_access(p.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.projects p ON p.id = r.project_id
      WHERE r.id = tasks.room_id
        AND public.user_has_project_access(p.id)
    )
  );

CREATE POLICY "tasks_delete_via_room" ON public.tasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rooms r
      JOIN public.projects p ON p.id = r.project_id
      WHERE r.id = tasks.room_id
        AND public.user_has_project_access(p.id)
    )
  );

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_select_via_project" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_via_project" ON public.documents;
DROP POLICY IF EXISTS "documents_update_via_project" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_via_project" ON public.documents;

CREATE POLICY "documents_select_via_project" ON public.documents
  FOR SELECT TO authenticated
  USING (public.user_has_project_access(documents.project_id));

CREATE POLICY "documents_insert_via_project" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_project_access(documents.project_id));

CREATE POLICY "documents_update_via_project" ON public.documents
  FOR UPDATE TO authenticated
  USING (public.user_has_project_access(documents.project_id))
  WITH CHECK (public.user_has_project_access(documents.project_id));

CREATE POLICY "documents_delete_via_project" ON public.documents
  FOR DELETE TO authenticated
  USING (public.user_has_project_access(documents.project_id));

-- ---------------------------------------------------------------------------
-- Storage: documents bucket
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_delete" ON storage.objects;

CREATE POLICY "documents_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.user_has_project_access(split_part(name, '/', 1)::uuid)
  );

CREATE POLICY "documents_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.user_has_project_access(split_part(name, '/', 1)::uuid)
  );

CREATE POLICY "documents_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.user_has_project_access(split_part(name, '/', 1)::uuid)
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND public.user_has_project_access(split_part(name, '/', 1)::uuid)
  );

CREATE POLICY "documents_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.user_has_project_access(split_part(name, '/', 1)::uuid)
  );

-- ---------------------------------------------------------------------------
-- project_expenses
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "project_expenses_select" ON public.project_expenses;
DROP POLICY IF EXISTS "project_expenses_insert" ON public.project_expenses;
DROP POLICY IF EXISTS "project_expenses_update" ON public.project_expenses;
DROP POLICY IF EXISTS "project_expenses_delete" ON public.project_expenses;

CREATE POLICY "project_expenses_select" ON public.project_expenses
  FOR SELECT TO authenticated
  USING (public.user_has_project_access(project_expenses.project_id));

CREATE POLICY "project_expenses_insert" ON public.project_expenses
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_project_access(project_expenses.project_id));

CREATE POLICY "project_expenses_update" ON public.project_expenses
  FOR UPDATE TO authenticated
  USING (public.user_has_project_access(project_expenses.project_id))
  WITH CHECK (public.user_has_project_access(project_expenses.project_id));

CREATE POLICY "project_expenses_delete" ON public.project_expenses
  FOR DELETE TO authenticated
  USING (public.user_has_project_access(project_expenses.project_id));

-- ---------------------------------------------------------------------------
-- chat_threads (shared when project_id is set)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "chat_threads_select_own" ON public.chat_threads;
DROP POLICY IF EXISTS "chat_threads_insert_own" ON public.chat_threads;
DROP POLICY IF EXISTS "chat_threads_update_own" ON public.chat_threads;
DROP POLICY IF EXISTS "chat_threads_delete_own" ON public.chat_threads;

CREATE POLICY "chat_threads_select" ON public.chat_threads
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      project_id IS NOT NULL
      AND public.user_has_project_access(chat_threads.project_id)
    )
  );

CREATE POLICY "chat_threads_insert" ON public.chat_threads
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      project_id IS NULL
      OR public.user_has_project_access(chat_threads.project_id)
    )
  );

CREATE POLICY "chat_threads_update" ON public.chat_threads
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      project_id IS NOT NULL
      AND public.user_has_project_access(chat_threads.project_id)
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (
      project_id IS NOT NULL
      AND public.user_has_project_access(chat_threads.project_id)
    )
  );

CREATE POLICY "chat_threads_delete" ON public.chat_threads
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      project_id IS NOT NULL
      AND public.is_project_owner(chat_threads.project_id)
    )
  );

-- ---------------------------------------------------------------------------
-- chat_messages
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "chat_messages_select_via_thread" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_via_thread" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete_via_thread" ON public.chat_messages;

CREATE POLICY "chat_messages_select_via_thread" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = chat_messages.thread_id
        AND (
          t.user_id = (SELECT auth.uid())
          OR (
            t.project_id IS NOT NULL
            AND public.user_has_project_access(t.project_id)
          )
        )
    )
  );

CREATE POLICY "chat_messages_insert_via_thread" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_threads th
      WHERE th.id = chat_messages.thread_id
        AND (
          th.user_id = (SELECT auth.uid())
          OR (
            th.project_id IS NOT NULL
            AND public.user_has_project_access(th.project_id)
          )
        )
    )
  );

CREATE POLICY "chat_messages_delete_via_thread" ON public.chat_messages
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = chat_messages.thread_id
        AND (
          t.user_id = (SELECT auth.uid())
          OR (
            t.project_id IS NOT NULL
            AND public.is_project_owner(t.project_id)
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- task_dependencies
-- ---------------------------------------------------------------------------
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
      WHERE t.id = task_dependencies.task_id
        AND public.user_has_project_access(p.id)
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
      WHERE t.id = task_dependencies.task_id
        AND public.user_has_project_access(p.id)
    )
    AND EXISTS (
      SELECT 1
      FROM public.tasks t2
      JOIN public.rooms r2 ON r2.id = t2.room_id
      JOIN public.projects p2 ON p2.id = r2.project_id
      WHERE t2.id = task_dependencies.depends_on_task_id
        AND public.user_has_project_access(p2.id)
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
      WHERE t.id = task_dependencies.task_id
        AND public.user_has_project_access(p.id)
    )
  );

-- ---------------------------------------------------------------------------
-- task_attachments
-- ---------------------------------------------------------------------------
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
      WHERE t.id = task_attachments.task_id
        AND public.user_has_project_access(p.id)
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
      WHERE t.id = task_attachments.task_id
        AND public.user_has_project_access(p.id)
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
      WHERE t.id = task_attachments.task_id
        AND public.user_has_project_access(p.id)
    )
  );

-- ---------------------------------------------------------------------------
-- key_handover_checklist_items
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "checklist_select" ON public.key_handover_checklist_items;
DROP POLICY IF EXISTS "checklist_insert" ON public.key_handover_checklist_items;
DROP POLICY IF EXISTS "checklist_update" ON public.key_handover_checklist_items;
DROP POLICY IF EXISTS "checklist_delete" ON public.key_handover_checklist_items;

CREATE POLICY "checklist_select" ON public.key_handover_checklist_items
  FOR SELECT TO authenticated
  USING (public.user_has_project_access(key_handover_checklist_items.project_id));

CREATE POLICY "checklist_insert" ON public.key_handover_checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_project_access(key_handover_checklist_items.project_id));

CREATE POLICY "checklist_update" ON public.key_handover_checklist_items
  FOR UPDATE TO authenticated
  USING (public.user_has_project_access(key_handover_checklist_items.project_id))
  WITH CHECK (public.user_has_project_access(key_handover_checklist_items.project_id));

CREATE POLICY "checklist_delete" ON public.key_handover_checklist_items
  FOR DELETE TO authenticated
  USING (public.user_has_project_access(key_handover_checklist_items.project_id));

-- ---------------------------------------------------------------------------
-- project_team_roster (owner-only writes)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "roster_select" ON public.project_team_roster;
DROP POLICY IF EXISTS "roster_insert" ON public.project_team_roster;
DROP POLICY IF EXISTS "roster_update" ON public.project_team_roster;
DROP POLICY IF EXISTS "roster_delete" ON public.project_team_roster;

CREATE POLICY "roster_select" ON public.project_team_roster
  FOR SELECT TO authenticated
  USING (public.user_has_project_access(project_team_roster.project_id));

CREATE POLICY "roster_insert" ON public.project_team_roster
  FOR INSERT TO authenticated
  WITH CHECK (public.is_project_owner(project_team_roster.project_id));

CREATE POLICY "roster_update" ON public.project_team_roster
  FOR UPDATE TO authenticated
  USING (public.is_project_owner(project_team_roster.project_id))
  WITH CHECK (public.is_project_owner(project_team_roster.project_id));

CREATE POLICY "roster_delete" ON public.project_team_roster
  FOR DELETE TO authenticated
  USING (public.is_project_owner(project_team_roster.project_id));
