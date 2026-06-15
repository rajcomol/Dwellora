-- Project-level planning anchor date (tasks use duration + sort order; task.start_date retained but unused in UI)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS planning_start_date date;

COMMENT ON COLUMN projects.planning_start_date IS 'Anchor date for cumulative task timeline; calendar dates derived from sort order × duration.';
