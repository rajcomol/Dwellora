-- 3D/AI Planner: opslag voor door DALL-E gegenereerde kamerrenders.
-- Publieke bucket (renders zijn direct via public URL te tonen in <img>),
-- pad-prefix = auth.uid() zodat alleen de eigenaar mag schrijven/verwijderen.

INSERT INTO storage.buckets (id, name, public)
VALUES ('planner-renders', 'planner-renders', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "planner_renders_select" ON storage.objects;
DROP POLICY IF EXISTS "planner_renders_insert" ON storage.objects;
DROP POLICY IF EXISTS "planner_renders_update" ON storage.objects;
DROP POLICY IF EXISTS "planner_renders_delete" ON storage.objects;

-- Publiek leesbaar (bucket is public; expliciete policy voor de zekerheid).
CREATE POLICY "planner_renders_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'planner-renders');

CREATE POLICY "planner_renders_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'planner-renders'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
  );

CREATE POLICY "planner_renders_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'planner-renders'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'planner-renders'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
  );

CREATE POLICY "planner_renders_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'planner-renders'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
  );
