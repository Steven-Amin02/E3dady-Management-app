-- Allow schedule speakers who are not registered church servants.
BEGIN;

ALTER TABLE public.service_schedules
  ADD COLUMN IF NOT EXISTS speaker_name text;

NOTIFY pgrst, 'reload schema';

COMMIT;
