-- Development-only destructive operation. Never use as a production repair.
BEGIN;
DO $$ BEGIN
  IF current_setting('e3dady.allow_destructive_seed',true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Destructive development operation disabled. See README.md.';
  END IF;
END $$;
-- ============================================================================
-- CHURCH YOUTH FELLOWSHIP (إعدادي - E3DADY)
-- SCRIPT: EMPTY / RESET ALL ATTENDANCE DATA
-- Run this in Supabase SQL Editor to clear all attendance records:
-- https://supabase.com/dashboard/project/grtsjkoitpkpaiwuclka/sql
-- ============================================================================

TRUNCATE TABLE public.attendance CASCADE;

-- Confirm table is empty:
SELECT count(*) AS total_attendance_records FROM public.attendance;

COMMIT;
