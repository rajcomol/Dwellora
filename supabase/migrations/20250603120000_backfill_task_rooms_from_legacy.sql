-- Backfill task_rooms from tasks.room_id — ONLY when that column still exists.
-- On databases where 20250521120000 already dropped room_id, this is a no-op.
-- Use supabase/scripts/repair_task_rooms_after_room_id_dropped.sql for recovery instead.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'room_id'
  ) THEN
    INSERT INTO public.task_rooms (task_id, room_id)
    SELECT id, room_id
    FROM public.tasks
    WHERE room_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
