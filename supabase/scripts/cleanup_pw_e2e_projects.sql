-- Eenmalige opruiming van Playwright-testprojecten (naam begint met 'PW ').
-- Maak EERST een backup (bijv. via: node scripts/cleanup-pw-e2e-projects.mjs --dry-run
-- en export uit de app), want DELETE is onomkeerbaar.
--
-- Gerelateerde rijen (rooms, tasks, project_expenses, …) verdwijnen via ON DELETE CASCADE.

-- SELECT id, name, created_at FROM public.projects WHERE name LIKE 'PW %' ORDER BY created_at;

DELETE FROM public.projects
WHERE name LIKE 'PW %';
