-- ============================================================================
-- CHURCH YOUTH FELLOWSHIP (إعدادي - E3DADY)
-- COMPLETE DATABASE PERMISSIONS FIX & REAL DATA SEED
-- Run this entire script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/grtsjkoitpkpaiwuclka/sql
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. GRANT SCHEMA PERMISSIONS (Fixes error 42501 permission denied)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 3. ENSURE TABLES EXIST
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
    last_contacted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.youth ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ NULL;
ALTER TABLE public.youth ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

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

CREATE TABLE IF NOT EXISTS public.follow_up_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youth_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
    servant_id UUID NOT NULL REFERENCES public.servants(id) ON DELETE CASCADE,
    contact_date DATE NOT NULL DEFAULT CURRENT_DATE,
    method TEXT NOT NULL CHECK (method IN ('call', 'whatsapp')),
    outcome TEXT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.servants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_logs ENABLE ROW LEVEL SECURITY;

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Servants viewable by authenticated users" ON public.servants;
DROP POLICY IF EXISTS "Admins can insert servants" ON public.servants;
DROP POLICY IF EXISTS "Admins can update servants" ON public.servants;
DROP POLICY IF EXISTS "Admins can delete servants" ON public.servants;
DROP POLICY IF EXISTS "Servants viewable by all" ON public.servants;
DROP POLICY IF EXISTS "allow_all_servants" ON public.servants;

DROP POLICY IF EXISTS "Youth viewable by authenticated servants" ON public.youth;
DROP POLICY IF EXISTS "Servants can insert youth" ON public.youth;
DROP POLICY IF EXISTS "Servants can update youth" ON public.youth;
DROP POLICY IF EXISTS "Admins can delete youth" ON public.youth;
DROP POLICY IF EXISTS "Youth viewable and editable by all" ON public.youth;
DROP POLICY IF EXISTS "allow_all_youth" ON public.youth;

DROP POLICY IF EXISTS "Attendance viewable by everyone" ON public.attendance;
DROP POLICY IF EXISTS "Attendance insertable by servants" ON public.attendance;
DROP POLICY IF EXISTS "Attendance updatable by servants" ON public.attendance;
DROP POLICY IF EXISTS "Attendance viewable and editable by all" ON public.attendance;
DROP POLICY IF EXISTS "allow_all_attendance" ON public.attendance;

DROP POLICY IF EXISTS "Schedules viewable by all" ON public.service_schedules;
DROP POLICY IF EXISTS "Admins can insert schedules" ON public.service_schedules;
DROP POLICY IF EXISTS "Admins can update schedules" ON public.service_schedules;
DROP POLICY IF EXISTS "Admins can delete schedules" ON public.service_schedules;
DROP POLICY IF EXISTS "allow_all_schedules" ON public.service_schedules;

DROP POLICY IF EXISTS "Follow up logs viewable and insertable by all" ON public.follow_up_logs;
DROP POLICY IF EXISTS "allow_all_follow_up_logs" ON public.follow_up_logs;

-- Create fully permissive policies for anon & authenticated
CREATE POLICY "allow_all_servants" ON public.servants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_youth" ON public.youth FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_attendance" ON public.attendance FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_schedules" ON public.service_schedules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_follow_up_logs" ON public.follow_up_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Grant explicit table privileges
GRANT ALL ON TABLE public.servants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.youth TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.attendance TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.service_schedules TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.follow_up_logs TO anon, authenticated, service_role;

-- 5. ENABLE REALTIME PUBLICATION
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.youth; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.servants; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_up_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- 6. TRUNCATE OLD DUMMY / OUTDATED DATA
TRUNCATE TABLE public.follow_up_logs, public.attendance, public.youth, public.service_schedules, public.servants CASCADE;

-- 7. INSERT REAL SERVANTS (7 SERVANTS)
INSERT INTO public.servants (id, name, phone, role) VALUES
  ('10000000-0000-0000-0000-000000000001', 'الأخ استيفن امين', '01203042189', 'admin'),
  ('10000000-0000-0000-0000-000000000002', 'الأخ اندرو عوني', '01147871179', 'admin'),
  ('10000000-0000-0000-0000-000000000003', 'الأخ مارتن إسحاق', '01223502628', 'admin'),
  ('10000000-0000-0000-0000-000000000004', 'الأخت ساندي عاطف', '01095507513', 'admin'),
  ('10000000-0000-0000-0000-000000000005', 'الأخت هايدي إبراهيم', '01221883492', 'admin'),
  ('10000000-0000-0000-0000-000000000006', 'الأخت برسيس زكي', '01221657634', 'admin'),
  ('10000000-0000-0000-0000-000000000007', 'الأخت رينا أسامة', '01208515308', 'admin');

-- 8. INSERT REAL YOUTH (42 YOUTH)
INSERT INTO public.youth (id, name, phone, school_year, assigned_servant_id, notes) VALUES
  ('20000000-0000-0000-0000-000000000001', 'استيفن عاطف', '01286316026', '1st Prep', '10000000-0000-0000-0000-000000000003', ''),
  ('20000000-0000-0000-0000-000000000002', 'بولس مجدي', '01225068415', '3rd Prep', '10000000-0000-0000-0000-000000000003', ''),
  ('20000000-0000-0000-0000-000000000003', 'جون امين', '01212282169', '3rd Prep', '10000000-0000-0000-0000-000000000002', ''),
  ('20000000-0000-0000-0000-000000000004', 'جوناثان صبحي', '01229600908', '2nd Prep', '10000000-0000-0000-0000-000000000002', 'الرقم المرفق هو رقم الام'),
  ('20000000-0000-0000-0000-000000000005', 'شادي فهمي', '01281012964', '3rd Prep', '10000000-0000-0000-0000-000000000001', 'الرقم المرفق هو رقم الام'),
  ('20000000-0000-0000-0000-000000000006', 'يوسف سعد', '01011598102', '3rd Prep', '10000000-0000-0000-0000-000000000001', ''),
  ('20000000-0000-0000-0000-000000000007', 'ماثيو نسيم', '01289821884', '3rd Prep', '10000000-0000-0000-0000-000000000003', ''),
  ('20000000-0000-0000-0000-000000000008', 'فلوباتير اشرف', '01003563268', '2nd Prep', '10000000-0000-0000-0000-000000000002', ''),
  ('20000000-0000-0000-0000-000000000009', 'بيتر ارميا', '01274839858', '1st Prep', '10000000-0000-0000-0000-000000000002', ''),
  ('20000000-0000-0000-0000-000000000010', 'مارتن سامح', '01283180065', '2nd Prep', '10000000-0000-0000-0000-000000000002', ''),
  ('20000000-0000-0000-0000-000000000011', 'نوفير اشرف', '01289531222', '1st Prep', '10000000-0000-0000-0000-000000000001', ''),
  ('20000000-0000-0000-0000-000000000012', 'جوليا معتز', '01227468200', '2nd Prep', '10000000-0000-0000-0000-000000000004', ''),
  ('20000000-0000-0000-0000-000000000013', 'ايمان جمال', '01289877665', '3rd Prep', '10000000-0000-0000-0000-000000000005', 'الرقم المرفق هو رقم الام'),
  ('20000000-0000-0000-0000-000000000014', 'نانسي بطرس', '01280445840', '2nd Prep', '10000000-0000-0000-0000-000000000006', ''),
  ('20000000-0000-0000-0000-000000000015', 'جيمس اسحق', '01223256618', '1st Prep', '10000000-0000-0000-0000-000000000003', ''),
  ('20000000-0000-0000-0000-000000000016', 'اندي صابر', '01289498857', '1st Prep', '10000000-0000-0000-0000-000000000001', ''),
  ('20000000-0000-0000-0000-000000000017', 'ديفيد مجدي', '01226978225', '1st Prep', '10000000-0000-0000-0000-000000000003', ''),
  ('20000000-0000-0000-0000-000000000018', 'ايريني *', '', '1st Prep', '10000000-0000-0000-0000-000000000004', 'لا يوجد رقم'),
  ('20000000-0000-0000-0000-000000000019', 'سارة يوحنا', '01281012973', '2nd Prep', '10000000-0000-0000-0000-000000000007', ''),
  ('20000000-0000-0000-0000-000000000020', 'كيرلس مودي', '01289432487', '1st Prep', '10000000-0000-0000-0000-000000000001', ''),
  ('20000000-0000-0000-0000-000000000021', 'كاترين سعد', '01012256351', '2nd Prep', '10000000-0000-0000-0000-000000000007', ''),
  ('20000000-0000-0000-0000-000000000022', 'لوجي مدحت', '01206418165', '1st Prep', '10000000-0000-0000-0000-000000000004', ''),
  ('20000000-0000-0000-0000-000000000023', 'كيرلس ثروت', '01206061674', '1st Prep', '10000000-0000-0000-0000-000000000002', ''),
  ('20000000-0000-0000-0000-000000000024', 'ايلاريا رأفت', '01275588639', '1st Prep', '10000000-0000-0000-0000-000000000007', ''),
  ('20000000-0000-0000-0000-000000000025', 'جوسي هاني', '01277773581', '1st Prep', '10000000-0000-0000-0000-000000000006', ''),
  ('20000000-0000-0000-0000-000000000026', 'جان هاني', '01277773581', '1st Prep', '10000000-0000-0000-0000-000000000003', ''),
  ('20000000-0000-0000-0000-000000000027', 'يوسف نبيل', '01040192393', '1st Prep', '10000000-0000-0000-0000-000000000003', ''),
  ('20000000-0000-0000-0000-000000000028', 'جوني ايهاب', '01281608940', '1st Prep', '10000000-0000-0000-0000-000000000003', ''),
  ('20000000-0000-0000-0000-000000000029', 'شنوده ياسر', '', '1st Prep', '10000000-0000-0000-0000-000000000002', 'لا يوجد رقم'),
  ('20000000-0000-0000-0000-000000000030', 'كارن ياسر', '', '1st Prep', '10000000-0000-0000-0000-000000000007', 'لا يوجد رقم'),
  ('20000000-0000-0000-0000-000000000031', 'ميراي رامي', '01203724988', '3rd Prep', '10000000-0000-0000-0000-000000000005', ''),
  ('20000000-0000-0000-0000-000000000032', 'دانيال نعيم', '', '1st Prep', '10000000-0000-0000-0000-000000000002', 'لا يوجد رقم'),
  ('20000000-0000-0000-0000-000000000033', 'يوسف منير', '01214833775', '1st Prep', '10000000-0000-0000-0000-000000000001', ''),
  ('20000000-0000-0000-0000-000000000034', 'بولا', '', '1st Prep', '10000000-0000-0000-0000-000000000003', 'لا يوجد رقم'),
  ('20000000-0000-0000-0000-000000000035', 'جومانه ماجد', '', '1st Prep', '10000000-0000-0000-0000-000000000006', 'لا يوجد رقم'),
  ('20000000-0000-0000-0000-000000000036', 'جوليا ماجد', '', '1st Prep', '10000000-0000-0000-0000-000000000005', ''),
  ('20000000-0000-0000-0000-000000000037', 'روفينا سعد', '01271631238', '1st Prep', '10000000-0000-0000-0000-000000000004', ''),
  ('20000000-0000-0000-0000-000000000038', 'مارونيا صموئيل', '01200482038', '1st Prep', '10000000-0000-0000-0000-000000000005', ''),
  ('20000000-0000-0000-0000-000000000039', 'جونير ثروت', '01289159289', '1st Prep', '10000000-0000-0000-0000-000000000006', ''),
  ('20000000-0000-0000-0000-000000000040', 'بيير هاني', '01210684499', '1st Prep', '10000000-0000-0000-0000-000000000001', ''),
  ('20000000-0000-0000-0000-000000000041', 'شنودة', '', '1st Prep', '10000000-0000-0000-0000-000000000001', 'لا يوجد رقم'),
  ('20000000-0000-0000-0000-000000000042', 'كيرلس قريب أميل', '01210049264', '1st Prep', '10000000-0000-0000-0000-000000000002', 'الرقم المرفق هو رقم الام');

-- 9. INSERT SERVICE SCHEDULES (3 SESSIONS)
INSERT INTO public.service_schedules (id, date, speaker_servant_id, lesson_title, activity_notes) VALUES
  ('30000000-0000-0000-0000-000000000101', '2026-09-25', '10000000-0000-0000-0000-000000000001', 'المحبة الحقيقية وبناء الصداقات', 'مسابقة كتابية وفقرة ترانيم جماعية'),
  ('30000000-0000-0000-0000-000000000102', '2026-10-02', '10000000-0000-0000-0000-000000000003', 'كيف أتعامل مع ضغوط الدراسة والامتحانات؟', 'ورشة عمل وتوزيع هدايا التفوق'),
  ('30000000-0000-0000-0000-000000000103', '2026-10-09', '10000000-0000-0000-0000-000000000002', 'حياة الصلاة الشخصية وسر التوبة', 'صلاة جماعية وتأمل روحي');

-- 10. ATTENDANCE TABLE (LEFT EMPTY FOR DIRECT APP RECORDING)
-- Table public.attendance starts completely empty so servants can record real attendance directly from the app.
TRUNCATE TABLE public.attendance CASCADE;

-- 11. RPC FUNCTIONS FOR DAILY ROTATION & CONTACT TRACKING
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
AS $func$
DECLARE
    v_dow INTEGER;
    v_diff INTEGER;
    v_last_friday DATE;
BEGIN
    v_dow := EXTRACT(DOW FROM p_target_date)::INTEGER;
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
            CASE 
                WHEN att.status = 'absent' AND (y.last_contacted_at IS NULL OR y.last_contacted_at < (v_last_friday::TIMESTAMPTZ)) THEN 1
                ELSE 2
            END AS priority_rank,
            CASE 
                WHEN att.status = 'absent' AND (y.last_contacted_at IS NULL OR y.last_contacted_at < (v_last_friday::TIMESTAMPTZ)) THEN 'غائب الجمعة الماضية ولم يتم افتقاده'
                WHEN y.last_contacted_at IS NULL THEN 'لم يتم افتقاده من قبل (دورية المتابعة العادلة)'
                ELSE 'دورية المتابعة العادلة (أقدم تاريخ تواصل)'
            END AS selection_reason,
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
$func$;

CREATE OR REPLACE FUNCTION public.mark_youth_contacted(
    p_youth_id UUID,
    p_servant_id UUID,
    p_method TEXT,
    p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_log_id UUID;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
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
$func$;
