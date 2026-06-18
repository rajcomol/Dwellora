CREATE OR REPLACE FUNCTION public.accept_project_invite(p_plain_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_inv public.project_invites%ROWTYPE;
  v_hash text;
  v_jwt_email text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  v_hash := encode(sha256(convert_to(trim(p_plain_token), 'UTF8')), 'hex');

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
