-- Allow tasks without an estimated cost (NULL = not set).

ALTER TABLE public.tasks
  ALTER COLUMN estimated_cost DROP NOT NULL,
  ALTER COLUMN estimated_cost DROP DEFAULT;
