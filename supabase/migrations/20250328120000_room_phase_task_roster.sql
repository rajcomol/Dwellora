-- Room renovation phase (ordered in app) + optional task assignment to team roster row.

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS renovation_phase text NOT NULL DEFAULT 'slopen';

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_roster_id uuid REFERENCES public.project_team_roster (id) ON DELETE SET NULL;

ALTER TABLE public.rooms
  DROP CONSTRAINT IF EXISTS rooms_renovation_phase_check;

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_renovation_phase_check CHECK (
    renovation_phase IN (
      'slopen',
      'ruwbouw',
      'installaties',
      'afbouw',
      'inrichting',
      'nazorg'
    )
  );
