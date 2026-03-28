-- Speed up scoped dashboard loads: filter by user projects, then rooms/tasks.
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects (user_id);
CREATE INDEX IF NOT EXISTS rooms_project_id_idx ON public.rooms (project_id);
CREATE INDEX IF NOT EXISTS tasks_room_id_idx ON public.tasks (room_id);
