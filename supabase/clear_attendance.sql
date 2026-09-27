-- ============================================================================
-- CHURCH YOUTH FELLOWSHIP (إعدادي - E3DADY)
-- SCRIPT: EMPTY / RESET ALL ATTENDANCE DATA
-- Run this in Supabase SQL Editor to clear all attendance records:
-- https://supabase.com/dashboard/project/grtsjkoitpkpaiwuclka/sql
-- ============================================================================

TRUNCATE TABLE public.attendance CASCADE;

-- Confirm table is empty:
SELECT count(*) AS total_attendance_records FROM public.attendance;
