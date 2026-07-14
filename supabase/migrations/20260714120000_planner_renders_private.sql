-- H2 audit-fix: planner-renders bucket privé maken.
--
-- AI-visualisaties van klantwoningen mochten niet wereldwijd leesbaar zijn via
-- een publieke URL. We zetten de bucket op private en vervangen de "iedereen mag
-- lezen"-SELECT-policy door een eigenaar-only policy. De app toont renders
-- voortaan via signed URLs (zie src/lib/planner/renderStorage.ts).
--
-- LET OP: bestaande renders die al in de (publieke) bucket staan worden hierna
-- privé; oude publieke links werken dan niet meer. Voor Staging is dat prima.
-- Voor PROD moet dit bewust gepland worden.

UPDATE storage.buckets SET public = false WHERE id = 'planner-renders';

-- SELECT: alleen de eigenaar (padprefix = auth.uid()), niet langer iedereen.
DROP POLICY IF EXISTS "planner_renders_select" ON storage.objects;
CREATE POLICY "planner_renders_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'planner-renders'
    AND split_part(name, '/', 1) = (SELECT auth.uid())::text
  );

-- insert/update/delete-policies (owner-only via padprefix) blijven ongewijzigd.
