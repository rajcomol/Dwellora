SELECT
  p.tablename,
  p.policyname,
  p.cmd,
  CASE
    WHEN p.qual LIKE '%user_has_project_access(project_id)%' THEN 'project_id_direct'
    WHEN p.qual LIKE '%user_has_task_access%' THEN 'task_access_recursive_risk'
    ELSE 'other'
  END AS policy_kind
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.tablename = 'tasks'
ORDER BY p.policyname, p.cmd;

SELECT
  p.prosecdef AS security_definer,
  p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('user_has_project_access', 'user_has_task_access');
