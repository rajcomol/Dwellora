-- Move renovation phase from room to task (planning order per task).

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS renovation_phase text NOT NULL DEFAULT 'slopen';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rooms'
      AND column_name = 'renovation_phase'
  ) THEN
    UPDATE public.tasks t
    SET renovation_phase = r.renovation_phase
    FROM public.rooms r
    WHERE t.room_id = r.id;
  END IF;
END $$;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_renovation_phase_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_renovation_phase_check CHECK (
    renovation_phase IN (
      'slopen',
      'ruwbouw',
      'installaties',
      'afbouw',
      'inrichting',
      'nazorg'
    )
  );

ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_renovation_phase_check;

ALTER TABLE public.rooms DROP COLUMN IF EXISTS renovation_phase;
