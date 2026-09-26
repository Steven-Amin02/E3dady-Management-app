-- ============================================================================
-- CHURCH YOUTH FELLOWSHIP (إعدادي - E3DADY)
-- MIGRATION: Shared Fellowship Attendance & Daily 1-Person Follow-Up Rotation
-- Date: 2026-09-27
-- ============================================================================

-- 1. Ensure basic schema exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.servants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'servant')) DEFAULT 'servant',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.youth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    school_year TEXT NOT NULL CHECK (school_year IN ('1st Prep', '2nd Prep', '3rd Prep')),
    assigned_servant_id UUID REFERENCES public.servants(id) ON DELETE SET NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youth_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
    recorded_by UUID REFERENCES public.servants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_youth_session_date UNIQUE (youth_id, session_date)
);

CREATE TABLE IF NOT EXISTS public.service_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    speaker_servant_id UUID REFERENCES public.servants(id) ON DELETE SET NULL,
    lesson_title TEXT NOT NULL,
    activity_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Schema Update: Add last_contacted_at column to youth
ALTER TABLE public.youth 
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ NULL;

-- 3. Schema Update: Create follow_up_logs table
CREATE TABLE IF NOT EXISTS public.follow_up_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youth_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
    servant_id UUID NOT NULL REFERENCES public.servants(id) ON DELETE CASCADE,
    contact_date DATE NOT NULL DEFAULT CURRENT_DATE,
    method TEXT NOT NULL CHECK (method IN ('call', 'whatsapp')),
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_youth_last_contacted ON public.youth(last_contacted_at);
CREATE INDEX IF NOT EXISTS idx_youth_assigned_servant ON public.youth(assigned_servant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_date ON public.attendance(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_youth_date ON public.attendance(youth_id, session_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_logs_servant_date ON public.follow_up_logs(servant_id, contact_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_logs_youth ON public.follow_up_logs(youth_id);

-- 5. Row Level Security Policies
ALTER TABLE public.servants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Servants viewable by all') THEN
        CREATE POLICY "Servants viewable by all" ON public.servants FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Youth viewable and editable by all') THEN
        CREATE POLICY "Youth viewable and editable by all" ON public.youth FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Attendance viewable and editable by all') THEN
        CREATE POLICY "Attendance viewable and editable by all" ON public.attendance FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Follow up logs viewable and insertable by all') THEN
        CREATE POLICY "Follow up logs viewable and insertable by all" ON public.follow_up_logs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 6. RPC Function: Deterministic Daily 1-Person Follow-Up Selector
-- Priority 1: Absent on most recent Friday and not contacted since.
-- Priority 2: Oldest last_contacted_at (fair round-robin, NULLs first).
-- Deterministic daily consistency per servant and date.
CREATE OR REPLACE FUNCTION public.get_daily_follow_up_youth(
    p_servant_id UUID,
    p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    phone TEXT,
    school_year TEXT,
    assigned_servant_id UUID,
    notes TEXT,
    last_contacted_at TIMESTAMPTZ,
    last_friday_date DATE,
    last_friday_status TEXT,
    is_absent_last_friday BOOLEAN,
    already_contacted_today BOOLEAN,
    selection_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dow INTEGER;
    v_diff INTEGER;
    v_last_friday DATE;
BEGIN
    -- Calculate preceding Friday
    v_dow := EXTRACT(DOW FROM p_target_date)::INTEGER; -- 0 is Sunday, 5 is Friday
    v_diff := (v_dow + 7 - 5) % 7;
    IF v_diff = 0 THEN
        v_diff := 7;
    END IF;
    v_last_friday := p_target_date - (v_diff * INTERVAL '1 day')::DATE;

    RETURN QUERY
    WITH assigned_pool AS (
        SELECT
            y.id,
            y.name,
            y.phone,
            y.school_year,
            y.assigned_servant_id,
            y.notes,
            y.last_contacted_at,
            v_last_friday AS last_friday_date,
            COALESCE(att.status, 'unrecorded') AS last_friday_status,
            (att.status = 'absent') AS is_absent_last_friday,
            EXISTS (
                SELECT 1 FROM public.follow_up_logs ful
                WHERE ful.youth_id = y.id 
                  AND ful.servant_id = p_servant_id 
                  AND ful.contact_date = p_target_date
            ) AS already_contacted_today,
            -- Determine Priority:
            -- 1: Absent last Friday and NOT contacted since that Friday
            -- 2: Round-robin by oldest contact date
            CASE 
                WHEN att.status = 'absent' AND (y.last_contacted_at IS NULL OR y.last_contacted_at < (v_last_friday::TIMESTAMPTZ)) THEN 1
                ELSE 2
            END AS priority_rank,
            CASE 
                WHEN att.status = 'absent' AND (y.last_contacted_at IS NULL OR y.last_contacted_at < (v_last_friday::TIMESTAMPTZ)) THEN 'غائب الجمعة الماضية ولم يتم افتقاده'
                WHEN y.last_contacted_at IS NULL THEN 'لم يتم افتقاده من قبل (دورية المتابعة العادلة)'
                ELSE 'دورية المتابعة العادلة (أقدم تاريخ تواصل)'
            END AS selection_reason,
            -- Deterministic tie breaker for consistency during the day
            abs(hashtext(p_servant_id::text || p_target_date::text || y.id::text)) AS daily_hash
        FROM public.youth y
        LEFT JOIN public.attendance att 
            ON att.youth_id = y.id AND att.session_date = v_last_friday
        WHERE y.assigned_servant_id = p_servant_id
    )
    SELECT
        ap.id,
        ap.name,
        ap.phone,
        ap.school_year,
        ap.assigned_servant_id,
        ap.notes,
        ap.last_contacted_at,
        ap.last_friday_date,
        ap.last_friday_status,
        ap.is_absent_last_friday,
        ap.already_contacted_today,
        ap.selection_reason
    FROM assigned_pool ap
    ORDER BY
        ap.priority_rank ASC,
        ap.last_contacted_at ASC NULLS FIRST,
        ap.daily_hash ASC
    LIMIT 1;
END;
$$;

-- 7. RPC Function: Mark Youth Contacted and Record Log
CREATE OR REPLACE FUNCTION public.mark_youth_contacted(
    p_youth_id UUID,
    p_servant_id UUID,
    p_method TEXT,
    p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    -- Insert Log
    INSERT INTO public.follow_up_logs (
        youth_id,
        servant_id,
        contact_date,
        method,
        notes,
        created_at
    ) VALUES (
        p_youth_id,
        p_servant_id,
        CURRENT_DATE,
        p_method,
        COALESCE(p_notes, ''),
        v_now
    ) RETURNING id INTO v_log_id;

    -- Update youth timestamp
    UPDATE public.youth
    SET last_contacted_at = v_now
    WHERE id = p_youth_id;

    RETURN jsonb_build_object(
        'success', true,
        'log_id', v_log_id,
        'youth_id', p_youth_id,
        'contacted_at', v_now
    );
END;
$$;

-- Enable Realtime for attendance and youth
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.youth;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;
