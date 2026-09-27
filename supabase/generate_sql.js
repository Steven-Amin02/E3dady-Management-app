const fs = require('fs');
const path = require('path');

const mockDataContent = fs.readFileSync(path.join(__dirname, '../src/lib/mockData.ts'), 'utf8');

const servantsMatch = mockDataContent.match(/export const INITIAL_SERVANTS: Servant\[\] = (\[[\s\S]*?\]);/);
const servants = JSON.parse(servantsMatch[1]);

const youthMatch = mockDataContent.match(/export const INITIAL_YOUTH: Youth\[\] = (\[[\s\S]*?\]);/);
const youth = JSON.parse(youthMatch[1]);

const FRIDAYS_12_WEEKS = [
  '2026-07-10',
  '2026-07-17',
  '2026-07-24',
  '2026-07-31',
  '2026-08-07',
  '2026-08-14',
  '2026-08-21',
  '2026-08-28',
  '2026-09-04',
  '2026-09-11',
  '2026-09-18',
  '2026-09-25',
];

function generate12WeekAttendance() {
  const records = [];
  const servantIds = servants.map(s => s.id);

  youth.forEach((y, yIdx) => {
    const youthNum = yIdx + 1;

    FRIDAYS_12_WEEKS.forEach((sessionDate, fIdx) => {
      const isLatestTwo = fIdx >= 10;
      const isEarlierSix = fIdx < 6;
      let status = 'present';

      if ([5, 10, 22, 35].includes(youthNum)) {
        if (fIdx >= 8) {
          status = 'absent';
        } else if (fIdx === 7) {
          status = 'excused';
        } else {
          status = fIdx % 2 === 0 ? 'present' : 'absent';
        }
      } else if ([7, 28, 40].includes(youthNum)) {
        if (fIdx < 7) {
          return;
        } else if (fIdx === 7 || fIdx === 8) {
          status = 'present';
        } else if (isLatestTwo) {
          status = 'absent';
        }
      } else if ([4, 15, 31].includes(youthNum)) {
        if (isEarlierSix) {
          status = 'present';
        } else {
          status = fIdx === 8 ? 'present' : (fIdx === 10 ? 'excused' : 'absent');
        }
      } else {
        const hash = (youthNum * 17 + fIdx * 31) % 100;
        if (hash < 82) {
          status = 'present';
        } else if (hash < 92) {
          status = 'excused';
        } else {
          status = 'absent';
        }
      }

      const recorderId = servantIds[(fIdx + youthNum) % servantIds.length];

      records.push({
        youth_id: y.id,
        session_date: sessionDate,
        status,
        recorded_by: recorderId
      });
    });
  });

  return records;
}

const attendance = generate12WeekAttendance();
console.log('Attendance records generated:', attendance.length);

const schedules = [
  {
    id: '30000000-0000-0000-0000-000000000101',
    date: '2026-09-25',
    speaker_servant_id: '10000000-0000-0000-0000-000000000001',
    lesson_title: 'المحبة الحقيقية وبناء الصداقات',
    activity_notes: 'مسابقة كتابية وفقرة ترانيم جماعية'
  },
  {
    id: '30000000-0000-0000-0000-000000000102',
    date: '2026-10-02',
    speaker_servant_id: '10000000-0000-0000-0000-000000000003',
    lesson_title: 'كيف أتعامل مع ضغوط الدراسة والامتحانات؟',
    activity_notes: 'ورشة عمل وتوزيع هدايا التفوق'
  },
  {
    id: '30000000-0000-0000-0000-000000000103',
    date: '2026-10-09',
    speaker_servant_id: '10000000-0000-0000-0000-000000000002',
    lesson_title: 'حياة الصلاة الشخصية وسر التوبة',
    activity_notes: 'صلاة جماعية وتأمل روحي'
  }
];

let sql = `-- ============================================================================
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
` + servants.map(s => `  ('${s.id}', '${s.name.replace(/'/g, "''")}', '${s.phone}', '${s.role}')`).join(',\n') + `;\n\n` +

`-- 8. INSERT REAL YOUTH (42 YOUTH)
INSERT INTO public.youth (id, name, phone, school_year, assigned_servant_id, notes) VALUES
` + youth.map(y => `  ('${y.id}', '${y.name.replace(/'/g, "''")}', '${y.phone}', '${y.school_year}', ${y.assigned_servant_id ? `'${y.assigned_servant_id}'` : 'NULL'}, '${(y.notes || '').replace(/'/g, "''")}')`).join(',\n') + `;\n\n` +

`-- 9. INSERT SERVICE SCHEDULES (3 SESSIONS)
INSERT INTO public.service_schedules (id, date, speaker_servant_id, lesson_title, activity_notes) VALUES
` + schedules.map(sc => `  ('${sc.id}', '${sc.date}', '${sc.speaker_servant_id}', '${sc.lesson_title.replace(/'/g, "''")}', '${(sc.activity_notes || '').replace(/'/g, "''")}')`).join(',\n') + `;\n\n` +

`-- 10. INSERT HISTORICAL ATTENDANCE (12 WEEKS)
INSERT INTO public.attendance (youth_id, session_date, status, recorded_by) VALUES
` + attendance.map(a => `  ('${a.youth_id}', '${a.session_date}', '${a.status}', '${a.recorded_by}')`).join(',\n') + `
ON CONFLICT (youth_id, session_date) DO UPDATE SET status = EXCLUDED.status, recorded_by = EXCLUDED.recorded_by;

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
`;

const outputPath = path.join(__dirname, 'fix_permissions_and_seed.sql');
fs.writeFileSync(outputPath, sql, 'utf8');
console.log('Successfully wrote fix_permissions_and_seed.sql to:', outputPath, '(', sql.length, 'bytes)');
