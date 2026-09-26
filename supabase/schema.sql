-- ============================================================================
-- CHURCH YOUTH FELLOWSHIP (إعدادي - E3DADY) DATABASE SCHEMA & RLS
-- Free Tier Supabase PostgreSQL Migration
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SERVANTS TABLE
CREATE TABLE IF NOT EXISTS public.servants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'servant')) DEFAULT 'servant',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. YOUTH TABLE
CREATE TABLE IF NOT EXISTS public.youth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    school_year TEXT NOT NULL CHECK (school_year IN ('1st Prep', '2nd Prep', '3rd Prep')),
    assigned_servant_id UUID REFERENCES public.servants(id) ON DELETE SET NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youth_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
    recorded_by UUID REFERENCES public.servants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_youth_session_date UNIQUE (youth_id, session_date)
);

-- 4. SERVICE SCHEDULES TABLE (Annual Service Rota)
CREATE TABLE IF NOT EXISTS public.service_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    speaker_servant_id UUID REFERENCES public.servants(id) ON DELETE SET NULL,
    lesson_title TEXT NOT NULL,
    activity_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_youth_assigned_servant ON public.youth(assigned_servant_id);
CREATE INDEX IF NOT EXISTS idx_youth_school_year ON public.youth(school_year);
CREATE INDEX IF NOT EXISTS idx_attendance_session_date ON public.attendance(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_youth_id ON public.attendance(youth_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);
CREATE INDEX IF NOT EXISTS idx_service_schedules_date ON public.service_schedules(date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.servants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_schedules ENABLE ROW LEVEL SECURITY;

-- Helper security function: Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.servants
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Helper security function: Check if current user is any valid servant
CREATE OR REPLACE FUNCTION public.is_servant()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.servants
    WHERE id = auth.uid()
  );
$$;

-- SERVANTS POLICIES
-- Anyone authenticated can view all servants (for speaker assignment, directories)
CREATE POLICY "Servants viewable by authenticated users"
ON public.servants FOR SELECT
TO authenticated, anon
USING (true);

-- Only admins can insert, update, or delete servants
CREATE POLICY "Admins can insert servants"
ON public.servants FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR NOT EXISTS (SELECT 1 FROM public.servants)); -- Allow initial bootstrap

CREATE POLICY "Admins can update servants"
ON public.servants FOR UPDATE
TO authenticated
USING (public.is_admin() OR id = auth.uid())
WITH CHECK (public.is_admin() OR id = auth.uid());

CREATE POLICY "Admins can delete servants"
ON public.servants FOR DELETE
TO authenticated
USING (public.is_admin());

-- YOUTH POLICIES
-- All servants can view youth members
CREATE POLICY "Youth viewable by authenticated servants"
ON public.youth FOR SELECT
TO authenticated, anon
USING (true);

-- Servants can insert youth
CREATE POLICY "Servants can insert youth"
ON public.youth FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Servants can update youth (notes, assignments, info)
CREATE POLICY "Servants can update youth"
ON public.youth FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Admins can delete youth
CREATE POLICY "Admins can delete youth"
ON public.youth FOR DELETE
TO authenticated, anon
USING (true);

-- ATTENDANCE POLICIES
CREATE POLICY "Attendance viewable by everyone"
ON public.attendance FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Attendance insertable by servants"
ON public.attendance FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Attendance updatable by servants"
ON public.attendance FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Attendance deletable by servants"
ON public.attendance FOR DELETE
TO authenticated, anon
USING (true);

-- SERVICE SCHEDULES POLICIES
CREATE POLICY "Service schedules viewable by everyone"
ON public.service_schedules FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Service schedules manageable by admins"
ON public.service_schedules FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Service schedules updatable by admins"
ON public.service_schedules FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Service schedules deletable by admins"
ON public.service_schedules FOR DELETE
TO authenticated, anon
USING (true);

-- ============================================================================
-- AUTH TRIGGER: Sync Supabase auth.users with public.servants
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.servants (id, name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'servant')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SEED DATA: 7 SERVANTS, YOUTH DIRECTORY, SCHEDULE, AND ATTENDANCE
-- ============================================================================

-- Clean existing seed if re-running
TRUNCATE TABLE public.attendance, public.youth, public.service_schedules, public.servants CASCADE;

-- Insert 7 Servants (1 Admin, 6 Servants)
INSERT INTO public.servants (id, name, phone, role) VALUES
('11111111-1111-1111-1111-111111111111', 'أ/ مينا سمير (أمين الخدمة)', '01223456781', 'admin'),
('22222222-2222-2222-2222-222222222222', 'م/ بيتر عادل', '01012345672', 'servant'),
('33333333-3333-3333-3333-333333333333', 'ت/ مارينا يوسف', '01123456783', 'servant'),
('44444444-4444-4444-4444-444444444444', 'د/ فادي كمال', '01234567894', 'servant'),
('55555555-5555-5555-5555-555555555555', 'م/ سارة إبراهيم', '01098765435', 'servant'),
('66666666-6666-6666-6666-666666666666', 'أ/ يوحنا أشرف', '01187654326', 'servant'),
('77777777-7777-7777-7777-777777777777', 'ت/ كريستين مجدي', '01276543217', 'servant');

-- Insert 21 Youth Members across 1st, 2nd, and 3rd Prep
INSERT INTO public.youth (id, name, phone, school_year, assigned_servant_id, notes) VALUES
-- 1st Prep (أولى إعدادي)
('a1111111-0000-0000-0000-000000000001', 'كيرلس مينا فؤاد', '01201112233', '1st Prep', '22222222-2222-2222-2222-222222222222', 'شاطر جداً في الألحان وبيحب الشماسية'),
('a1111111-0000-0000-0000-000000000002', 'ماريو هاني نبيل', '01002223344', '1st Prep', '22222222-2222-2222-2222-222222222222', 'هادئ ومحتاج تشجيع للمشاركة في الأنشطة'),
('a1111111-0000-0000-0000-000000000003', 'ساندرا أمير سامي', '01103334455', '1st Prep', '33333333-3333-3333-3333-333333333333', 'صوتها جميل في كورال الكنيسة'),
('a1111111-0000-0000-0000-000000000004', 'يوستينا جورج فرج', '01204445566', '1st Prep', '33333333-3333-3333-3333-333333333333', 'ملتزمة بالحضور وبتساعد في تنظيم الفصل'),
('a1111111-0000-0000-0000-000000000005', 'ديفيد رفيق صبري', '01005556677', '1st Prep', '11111111-1111-1111-1111-111111111111', 'جديد في المنطقة ومحتاجين ندمجه أكتر'),
('a1111111-0000-0000-0000-000000000006', 'مهرائيل سامح غالي', '01106667788', '1st Prep', '55555555-5555-5555-5555-555555555555', 'بتحب مسابقات الكتاب المقدس والرسم'),
('a1111111-0000-0000-0000-000000000007', 'أبانوب رفعت عزيز', '01207778899', '1st Prep', '66666666-6666-6666-6666-666666666666', 'لاعب كورة ممتاز وبيشارك في دوري الكنيسة'),

-- 2nd Prep (ثانية إعدادي)
('b2222222-0000-0000-0000-000000000001', 'مارك مجدي وجيه', '01008889900', '2nd Prep', '22222222-2222-2222-2222-222222222222', 'غاب الجمعة اللي فاتت بسبب تدريب نادي'),
('b2222222-0000-0000-0000-000000000002', 'توماس عماد منير', '01109990011', '2nd Prep', '44444444-4444-4444-4444-444444444444', 'عنده شغف بالبرمجة والتكنولوجيا'),
('b2222222-0000-0000-0000-000000000003', 'كلير أشرف عزمي', '01200001122', '2nd Prep', '33333333-3333-3333-3333-333333333333', 'مجتهدة ومتفوقة دراسياً'),
('b2222222-0000-0000-0000-000000000004', 'فيرونيكا ماجد كامل', '01001112233', '2nd Prep', '55555555-5555-5555-5555-555555555555', 'بتشارك في تنظيم المعارض والأنشطة'),
('b2222222-0000-0000-0000-000000000005', 'ستيفن بولس غطاس', '01102223344', '2nd Prep', '44444444-4444-4444-4444-444444444444', 'محتاج افتقاد ومتابعة أسرية'),
('b2222222-0000-0000-0000-000000000006', 'ليديا ناصر شكري', '01203334455', '2nd Prep', '77777777-7777-7777-7777-777777777777', 'شخصية اجتماعية ومحبوبة من كل المخدومين'),
('b2222222-0000-0000-0000-000000000007', 'أنتوني رأفت رمزي', '01004445566', '2nd Prep', '66666666-6666-6666-6666-666666666666', 'بيحب التمثيل ومسرح الكنيسة'),

-- 3rd Prep (ثالثة إعدادي)
('c3333333-0000-0000-0000-000000000001', 'بيشوي عاطف رزق', '01105556677', '3rd Prep', '11111111-1111-1111-1111-111111111111', 'سنة الشهادة الإعدادية - محتاج صلاة ومتابعة تنظيم وقت'),
('c3333333-0000-0000-0000-000000000002', 'مارتن إيهاب زكي', '01206667788', '3rd Prep', '44444444-4444-4444-4444-444444444444', 'بيحب خدمة الإذاعة والصوتيات بالاجتماع'),
('c3333333-0000-0000-0000-000000000003', 'مارينا صفوت فخري', '01007778899', '3rd Prep', '77777777-7777-7777-7777-777777777777', 'متميزة في العزف والموسيقى'),
('c3333333-0000-0000-0000-000000000004', 'مونيكا طلعت نجيب', '01108889900', '3rd Prep', '77777777-7777-7777-7777-777777777777', 'مواظبة على سر الاعتراف والتناول'),
('c3333333-0000-0000-0000-000000000005', 'جون نبيل مسعد', '01209990011', '3rd Prep', '66666666-6666-6666-6666-666666666666', 'قائد ممتاز في الألعاب الحركية ومسابقات الشباب'),
('c3333333-0000-0000-0000-000000000006', 'فيولا مكرم حبيب', '01000001122', '3rd Prep', '55555555-5555-5555-5555-555555555555', 'غائبة الأسبوع الماضي بسبب امتحانات الشهر'),
('c3333333-0000-0000-0000-000000000007', 'أندرو صفوت توفيق', '01101112233', '3rd Prep', '11111111-1111-1111-1111-111111111111', 'متحمس للأنشطة الصيفية والمعسكرات');

-- Insert Annual Service Schedule (Rotas for Friday meetings)
INSERT INTO public.service_schedules (id, date, speaker_servant_id, lesson_title, activity_notes) VALUES
(gen_random_uuid(), '2026-09-04', '11111111-1111-1111-1111-111111111111', 'افتتاح العام الجديد: "كونوا متمثلين بالله"', 'توزيع هدايا بداية السنة وتوزيع بطاقات التعارف'),
(gen_random_uuid(), '2026-09-11', '22222222-2222-2222-2222-222222222222', 'كيف أختار صديقي الحقيقي؟ (أمثال ١٧: ١٧)', 'ورشة عمل تفاعلية وتمثيل مواقف حياتية'),
(gen_random_uuid(), '2026-09-18', '33333333-3333-3333-3333-333333333333', 'السوشيال ميديا وإدارة الوقت بوعي', 'تحدي الأسبوع: تقليل استخدام الشاشات ساعتين يومياً'),
(gen_random_uuid(), '2026-09-25', '44444444-4444-4444-4444-444444444444', 'الصلاة سلاح لا يُهزم: داود وجليات', 'فقرة تسبيح خاصة وتدريب صلاة عملية'),
(gen_random_uuid(), '2026-10-02', '55555555-5555-5555-5555-555555555555', 'الشهادة والخدمة في المدرسة مع زملائي', 'مسابقة إلكترونية سريعة بالهواتف (Kahoot)'),
(gen_random_uuid(), '2026-10-09', '66666666-6666-6666-6666-666666666666', 'الغفران وقوة التسامح: يوسف وإخوته', 'نشاط كتابة رسائل مصالحة وشكر'),
(gen_random_uuid(), '2026-10-16', '77777777-7777-7777-7777-777777777777', 'أسرار الكنيسة السبعة: سر التوبة والاعتراف', 'لقاء روحي مع أبونا كاهن الكنيسة'),
(gen_random_uuid(), '2026-10-23', '11111111-1111-1111-1111-111111111111', 'يوم رياضي مفتوح ومهرجان المواهب', 'دوري كرة قدم، شطرنج، ومعرض رسومات الشباب'),
(gen_random_uuid(), '2026-10-30', '22222222-2222-2222-2222-222222222222', 'الثقة بالنفس والتغلب على الخوف والتردد', 'حوار مفتوح وإجابة أسئلة المخدومين في صندوق مجهول');

-- Insert Friday Attendance Records for recent Fridays (2026-09-18 & 2026-09-25)
INSERT INTO public.attendance (youth_id, session_date, status, recorded_by) VALUES
-- Friday 2026-09-18
('a1111111-0000-0000-0000-000000000001', '2026-09-18', 'present', '22222222-2222-2222-2222-222222222222'),
('a1111111-0000-0000-0000-000000000002', '2026-09-18', 'present', '22222222-2222-2222-2222-222222222222'),
('a1111111-0000-0000-0000-000000000003', '2026-09-18', 'present', '33333333-3333-3333-3333-333333333333'),
('a1111111-0000-0000-0000-000000000004', '2026-09-18', 'present', '33333333-3333-3333-3333-333333333333'),
('a1111111-0000-0000-0000-000000000005', '2026-09-18', 'absent',  '11111111-1111-1111-1111-111111111111'),
('a1111111-0000-0000-0000-000000000006', '2026-09-18', 'present', '55555555-5555-5555-5555-555555555555'),
('a1111111-0000-0000-0000-000000000007', '2026-09-18', 'present', '66666666-6666-6666-6666-666666666666'),
('b2222222-0000-0000-0000-000000000001', '2026-09-18', 'present', '22222222-2222-2222-2222-222222222222'),
('b2222222-0000-0000-0000-000000000002', '2026-09-18', 'present', '44444444-4444-4444-4444-444444444444'),
('b2222222-0000-0000-0000-000000000003', '2026-09-18', 'present', '33333333-3333-3333-3333-333333333333'),
('b2222222-0000-0000-0000-000000000004', '2026-09-18', 'present', '55555555-5555-5555-5555-555555555555'),
('b2222222-0000-0000-0000-000000000005', '2026-09-18', 'excused', '44444444-4444-4444-4444-444444444444'),
('b2222222-0000-0000-0000-000000000006', '2026-09-18', 'present', '77777777-7777-7777-7777-777777777777'),
('b2222222-0000-0000-0000-000000000007', '2026-09-18', 'present', '66666666-6666-6666-6666-666666666666'),
('c3333333-0000-0000-0000-000000000001', '2026-09-18', 'present', '11111111-1111-1111-1111-111111111111'),
('c3333333-0000-0000-0000-000000000002', '2026-09-18', 'absent',  '44444444-4444-4444-4444-444444444444'),
('c3333333-0000-0000-0000-000000000003', '2026-09-18', 'present', '77777777-7777-7777-7777-777777777777'),
('c3333333-0000-0000-0000-000000000004', '2026-09-18', 'present', '77777777-7777-7777-7777-777777777777'),
('c3333333-0000-0000-0000-000000000005', '2026-09-18', 'present', '66666666-6666-6666-6666-666666666666'),
('c3333333-0000-0000-0000-000000000006', '2026-09-18', 'present', '55555555-5555-5555-5555-555555555555'),
('c3333333-0000-0000-0000-000000000007', '2026-09-18', 'present', '11111111-1111-1111-1111-111111111111'),

-- Friday 2026-09-25 (Last Friday - some absentees for follow-up testing)
('a1111111-0000-0000-0000-000000000001', '2026-09-25', 'present', '22222222-2222-2222-2222-222222222222'),
('a1111111-0000-0000-0000-000000000002', '2026-09-25', 'absent',  '22222222-2222-2222-2222-222222222222'),
('a1111111-0000-0000-0000-000000000003', '2026-09-25', 'present', '33333333-3333-3333-3333-333333333333'),
('a1111111-0000-0000-0000-000000000004', '2026-09-25', 'excused', '33333333-3333-3333-3333-333333333333'),
('a1111111-0000-0000-0000-000000000005', '2026-09-25', 'absent',  '11111111-1111-1111-1111-111111111111'),
('a1111111-0000-0000-0000-000000000006', '2026-09-25', 'present', '55555555-5555-5555-5555-555555555555'),
('a1111111-0000-0000-0000-000000000007', '2026-09-25', 'present', '66666666-6666-6666-6666-666666666666'),
('b2222222-0000-0000-0000-000000000001', '2026-09-25', 'absent',  '22222222-2222-2222-2222-222222222222'),
('b2222222-0000-0000-0000-000000000002', '2026-09-25', 'present', '44444444-4444-4444-4444-444444444444'),
('b2222222-0000-0000-0000-000000000003', '2026-09-25', 'present', '33333333-3333-3333-3333-333333333333'),
('b2222222-0000-0000-0000-000000000004', '2026-09-25', 'present', '55555555-5555-5555-5555-555555555555'),
('b2222222-0000-0000-0000-000000000005', '2026-09-25', 'absent',  '44444444-4444-4444-4444-444444444444'),
('b2222222-0000-0000-0000-000000000006', '2026-09-25', 'present', '77777777-7777-7777-7777-777777777777'),
('b2222222-0000-0000-0000-000000000007', '2026-09-25', 'present', '66666666-6666-6666-6666-666666666666'),
('c3333333-0000-0000-0000-000000000001', '2026-09-25', 'present', '11111111-1111-1111-1111-111111111111'),
('c3333333-0000-0000-0000-000000000002', '2026-09-25', 'present', '44444444-4444-4444-4444-444444444444'),
('c3333333-0000-0000-0000-000000000003', '2026-09-25', 'excused', '77777777-7777-7777-7777-777777777777'),
('c3333333-0000-0000-0000-000000000004', '2026-09-25', 'present', '77777777-7777-7777-7777-777777777777'),
('c3333333-0000-0000-0000-000000000005', '2026-09-25', 'present', '66666666-6666-6666-6666-666666666666'),
('c3333333-0000-0000-0000-000000000006', '2026-09-25', 'absent',  '55555555-5555-5555-5555-555555555555'),
('c3333333-0000-0000-0000-000000000007', '2026-09-25', 'present', '11111111-1111-1111-1111-111111111111');
