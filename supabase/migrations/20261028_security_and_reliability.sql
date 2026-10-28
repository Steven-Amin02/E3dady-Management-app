-- Safe for an existing database: no operational rows are deleted or reseeded.
-- This migration also supports a fresh Supabase project. Run it as the database owner.
BEGIN;
CREATE TABLE IF NOT EXISTS public.servants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, phone text NOT NULL,
  role text NOT NULL DEFAULT 'servant' CHECK (role IN ('admin','servant')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.youth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, phone text NOT NULL,
  school_year text NOT NULL CHECK (school_year IN ('1st Prep','2nd Prep','3rd Prep')),
  assigned_servant_id uuid REFERENCES public.servants ON DELETE SET NULL, notes text DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), youth_id uuid NOT NULL REFERENCES public.youth ON DELETE CASCADE,
  session_date date NOT NULL, status text NOT NULL CHECK (status IN ('present','absent','excused')),
  recorded_by uuid REFERENCES public.servants ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (youth_id,session_date)
);
CREATE TABLE IF NOT EXISTS public.service_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), date date NOT NULL,
  speaker_servant_id uuid REFERENCES public.servants ON DELETE SET NULL,
  lesson_title text NOT NULL, activity_notes text DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.follow_up_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), youth_id uuid NOT NULL REFERENCES public.youth ON DELETE CASCADE,
  servant_id uuid NOT NULL REFERENCES public.servants ON DELETE RESTRICT, contact_date date NOT NULL,
  method text NOT NULL CHECK (method IN ('call','whatsapp')), notes text DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.servants ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS servants_auth_user_id_key ON public.servants(auth_user_id);
ALTER TABLE public.youth ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;
-- Unknown legacy joining dates stay NULL; recording/import time is not enrollment time.
ALTER TABLE public.youth ADD COLUMN IF NOT EXISTS joined_on date;
ALTER TABLE public.youth ADD COLUMN IF NOT EXISTS left_on date;
ALTER TABLE public.follow_up_logs ADD COLUMN IF NOT EXISTS outcome text;
ALTER TABLE public.follow_up_logs ADD COLUMN IF NOT EXISTS contacted_at timestamptz;
ALTER TABLE public.follow_up_logs DROP CONSTRAINT IF EXISTS follow_up_logs_servant_id_fkey;
ALTER TABLE public.follow_up_logs ADD CONSTRAINT follow_up_logs_servant_id_fkey FOREIGN KEY(servant_id) REFERENCES public.servants(id) ON DELETE RESTRICT;
CREATE SEQUENCE IF NOT EXISTS public.attendance_version_seq;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT nextval('public.attendance_version_seq');
CREATE TABLE IF NOT EXISTS public.daily_follow_up_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), servant_id uuid NOT NULL REFERENCES public.servants ON DELETE RESTRICT,
  youth_id uuid NOT NULL REFERENCES public.youth ON DELETE CASCADE, task_date date NOT NULL,
  completed_at timestamptz, UNIQUE(servant_id,task_date)
);
CREATE TABLE IF NOT EXISTS public.processed_operations (
  id uuid PRIMARY KEY, auth_user_id uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  kind text NOT NULL, payload_hash text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.attendance_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operation_id uuid NOT NULL, auth_user_id uuid NOT NULL, servant_id uuid NOT NULL,
  youth_id uuid NOT NULL, session_date date NOT NULL, before_value jsonb, after_value jsonb,
  reason_category text NOT NULL DEFAULT '', reason_notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.youth_school_years (
  youth_id uuid NOT NULL REFERENCES public.youth ON DELETE CASCADE, academic_year_start date NOT NULL,
  school_year text NOT NULL CHECK(school_year IN ('1st Prep','2nd Prep','3rd Prep')), PRIMARY KEY(youth_id,academic_year_start)
);
CREATE TABLE IF NOT EXISTS public.academic_promotions (
  academic_year_start date PRIMARY KEY, auth_user_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.academic_year_start(p_date date) RETURNS date LANGUAGE sql IMMUTABLE
SET search_path=pg_catalog AS $$ SELECT make_date(extract(year FROM p_date)::integer-CASE WHEN extract(month FROM p_date)<9 THEN 1 ELSE 0 END,9,1) $$;
INSERT INTO public.youth_school_years(youth_id,academic_year_start,school_year)
SELECT y.id,public.academic_year_start((now() AT TIME ZONE 'Africa/Cairo')::date),y.school_year FROM public.youth y
WHERE NOT EXISTS(SELECT 1 FROM public.youth_school_years h WHERE h.youth_id=y.id)
ON CONFLICT DO NOTHING;
ALTER TABLE public.youth ALTER COLUMN joined_on SET DEFAULT ((now() AT TIME ZONE 'Africa/Cairo')::date);
CREATE INDEX IF NOT EXISTS attendance_session_youth_idx ON public.attendance(session_date,youth_id);
CREATE INDEX IF NOT EXISTS follow_up_logs_date_idx ON public.follow_up_logs(contact_date,id);

CREATE OR REPLACE FUNCTION public.current_servant_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public AS $$ SELECT id FROM public.servants WHERE auth_user_id = auth.uid() $$;
CREATE OR REPLACE FUNCTION public.is_servant() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public AS $$ SELECT public.current_servant_id() IS NOT NULL $$;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public AS $$ SELECT EXISTS (SELECT 1 FROM public.servants WHERE auth_user_id = auth.uid() AND role='admin') $$;

-- Remove signup metadata trust and every legacy permissive policy on our tables.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.bulk_record_attendance(jsonb,uuid);
DROP FUNCTION IF EXISTS public.mark_youth_contacted(uuid,uuid,text,text);
DROP FUNCTION IF EXISTS public.get_daily_follow_up_youth(uuid,date);
DROP FUNCTION IF EXISTS public.get_roster_by_date(date);
DO $$ DECLARE item record; table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['servants','youth','attendance','service_schedules','follow_up_logs','daily_follow_up_tasks','processed_operations','attendance_audit','youth_school_years','academic_promotions'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    FOR item IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=table_name LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',item.policyname,table_name);
    END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',table_name);
  END LOOP;
END $$;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon,authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon,authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.servants,public.youth,public.attendance,public.service_schedules,public.follow_up_logs,public.daily_follow_up_tasks,public.attendance_audit,public.youth_school_years TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.servants,public.youth,public.service_schedules TO authenticated;
CREATE POLICY servants_read ON public.servants FOR SELECT TO authenticated USING (public.is_servant());
CREATE POLICY servants_admin ON public.servants FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY youth_read ON public.youth FOR SELECT TO authenticated USING (public.is_servant());
CREATE POLICY youth_insert ON public.youth FOR INSERT TO authenticated WITH CHECK (public.is_servant());
CREATE POLICY youth_update ON public.youth FOR UPDATE TO authenticated USING (public.is_servant()) WITH CHECK (public.is_servant());
CREATE POLICY youth_delete ON public.youth FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY attendance_read ON public.attendance FOR SELECT TO authenticated USING (public.is_servant());
CREATE POLICY schedules_read ON public.service_schedules FOR SELECT TO authenticated USING (public.is_servant());
CREATE POLICY schedules_admin ON public.service_schedules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY follow_up_read ON public.follow_up_logs FOR SELECT TO authenticated USING (public.is_servant());
CREATE POLICY daily_tasks_read ON public.daily_follow_up_tasks FOR SELECT TO authenticated USING (servant_id=public.current_servant_id() OR public.is_admin());
CREATE POLICY audit_admin_read ON public.attendance_audit FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY school_years_read ON public.youth_school_years FOR SELECT TO authenticated USING (public.is_servant());
CREATE OR REPLACE FUNCTION public.validate_service_schedule() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,public AS $$
BEGIN
  IF extract(dow FROM NEW.date)<>5 OR length(trim(NEW.lesson_title))=0 THEN
    RAISE EXCEPTION 'A Friday date and lesson title are required' USING ERRCODE='23514'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('schedule/'||NEW.date::text,0));
  IF EXISTS(SELECT 1 FROM public.service_schedules WHERE date=NEW.date AND id<>NEW.id) THEN
    RAISE EXCEPTION 'A schedule already exists for this Friday' USING ERRCODE='23505'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_service_schedule ON public.service_schedules;
CREATE TRIGGER validate_service_schedule BEFORE INSERT OR UPDATE ON public.service_schedules FOR EACH ROW EXECUTE FUNCTION public.validate_service_schedule();

CREATE OR REPLACE FUNCTION public.track_school_year() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.left_on IS DISTINCT FROM OLD.left_on AND auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can archive membership' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.youth_school_years(youth_id,academic_year_start,school_year)
  VALUES(NEW.id,public.academic_year_start((now() AT TIME ZONE 'Africa/Cairo')::date),NEW.school_year)
  ON CONFLICT(youth_id,academic_year_start) DO UPDATE SET school_year=excluded.school_year;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS track_school_year ON public.youth;
CREATE TRIGGER track_school_year AFTER INSERT OR UPDATE OF school_year,left_on ON public.youth FOR EACH ROW EXECUTE FUNCTION public.track_school_year();
CREATE OR REPLACE FUNCTION public.promote_academic_year() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE year_start date:=public.academic_year_start((now() AT TIME ZONE 'Africa/Cairo')::date); changed integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(734222);
  IF EXISTS(SELECT 1 FROM public.academic_promotions WHERE academic_year_start=year_start) THEN RETURN jsonb_build_object('count',0); END IF;
  UPDATE public.youth y SET
    school_year=CASE y.school_year WHEN '1st Prep' THEN '2nd Prep' WHEN '2nd Prep' THEN '3rd Prep' ELSE y.school_year END,
    left_on=CASE WHEN y.school_year='3rd Prep' THEN year_start ELSE y.left_on END
  WHERE (y.left_on IS NULL OR y.left_on>year_start) AND (y.joined_on IS NULL OR y.joined_on<year_start)
    AND NOT EXISTS(SELECT 1 FROM public.youth_school_years h WHERE h.youth_id=y.id AND h.academic_year_start=year_start);
  GET DIAGNOSTICS changed=ROW_COUNT;
  INSERT INTO public.academic_promotions(academic_year_start,auth_user_id) VALUES(year_start,auth.uid());
  RETURN jsonb_build_object('count',changed);
END $$;

CREATE OR REPLACE FUNCTION public.protect_servant_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(734221);
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
  IF TG_OP='DELETE' AND OLD.auth_user_id=auth.uid() THEN RAISE EXCEPTION 'Cannot delete the signed-in servant' USING ERRCODE='23514'; END IF;
  IF OLD.role='admin' AND (TG_OP='DELETE' OR NEW.role<>'admin' OR (OLD.auth_user_id IS NOT NULL AND NEW.auth_user_id IS NULL))
    AND NOT EXISTS(SELECT 1 FROM public.servants WHERE role='admin' AND auth_user_id IS NOT NULL AND id<>OLD.id) THEN
    RAISE EXCEPTION 'Cannot remove the last linked administrator' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DROP TRIGGER IF EXISTS protect_servant_identity ON public.servants;
CREATE TRIGGER protect_servant_identity BEFORE UPDATE OR DELETE ON public.servants FOR EACH ROW EXECUTE FUNCTION public.protect_servant_identity();

-- Only the contact transaction can change a contact timestamp. Directory writes
-- cannot pretend that a call happened without creating a log.
REVOKE UPDATE ON public.youth FROM authenticated;
GRANT UPDATE(name,phone,school_year,assigned_servant_id,notes,joined_on,left_on) ON public.youth TO authenticated;
REVOKE INSERT ON public.youth FROM authenticated;
GRANT INSERT(id,name,phone,school_year,assigned_servant_id,notes,joined_on,left_on) ON public.youth TO authenticated;
REVOKE UPDATE,INSERT ON public.servants FROM authenticated;
GRANT INSERT(name,phone,role) ON public.servants TO authenticated;
GRANT UPDATE(name,phone,role) ON public.servants TO authenticated;

CREATE OR REPLACE FUNCTION public.record_attendance_changes(p_operation_id uuid,p_changes jsonb,p_audit_category text DEFAULT '',p_audit_notes text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE actor uuid:=public.current_servant_id(); today date:=(now() AT TIME ZONE 'Africa/Cairo')::date;
  item jsonb; target_date date; target_youth uuid; next_status text; previous public.attendance%ROWTYPE;
  after_row jsonb; expected bigint; cached public.processed_operations%ROWTYPE;
  fingerprint text:=md5(p_changes::text||coalesce(p_audit_category,'')||coalesce(p_audit_notes,'')); count_changed integer:=0;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Servant access required' USING ERRCODE='42501'; END IF;
  IF p_operation_id IS NULL OR p_changes IS NULL OR jsonb_typeof(p_changes)<>'array' OR jsonb_array_length(p_changes) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Invalid attendance operation' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_operation_id::text,0));
  SELECT * INTO cached FROM public.processed_operations WHERE id=p_operation_id;
  IF FOUND THEN
    IF cached.auth_user_id<>auth.uid() OR cached.kind<>'attendance' OR cached.payload_hash<>fingerprint THEN RAISE EXCEPTION 'Operation ID reused' USING ERRCODE='22023'; END IF;
    RETURN cached.result;
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_changes) e GROUP BY e->>'youth_id',e->>'session_date' HAVING count(*)>1) THEN
    RAISE EXCEPTION 'Duplicate attendance key' USING ERRCODE='22023'; END IF;
  -- Serialize same-session edits, including two concurrent inserts of a missing row.
  FOR target_date IN SELECT DISTINCT (e->>'session_date')::date FROM jsonb_array_elements(p_changes) e ORDER BY 1 LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('attendance/'||target_date::text,0));
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
    target_date:=(item->>'session_date')::date; target_youth:=(item->>'youth_id')::uuid;
    next_status:=item->>'status'; expected:=(item->>'expected_version')::bigint;
    IF target_date IS NULL OR target_youth IS NULL OR extract(dow FROM target_date)<>5 OR target_date>today OR
      (next_status IS NOT NULL AND next_status NOT IN ('present','absent','excused')) OR NOT (item ? 'expected_version') OR NOT (item ? 'status') THEN
      RAISE EXCEPTION 'Invalid attendance row or session date' USING ERRCODE='22023'; END IF;
    IF target_date<today-2 AND (coalesce(p_audit_category,'') NOT IN
      ('guardian_verified','clerical_correction','late_arrival_verified','medical_family_excuse','other') OR length(trim(coalesce(p_audit_notes,'')))<3) THEN
      RAISE EXCEPTION 'Archived sessions require a servant audit reason' USING ERRCODE='42501'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.youth WHERE id=target_youth AND (joined_on IS NULL OR joined_on<=target_date) AND (left_on IS NULL OR left_on>target_date)) THEN
      RAISE EXCEPTION 'Youth not enrolled on session date' USING ERRCODE='23514'; END IF;
    SELECT * INTO previous FROM public.attendance WHERE youth_id=target_youth AND session_date=target_date FOR UPDATE;
    IF previous.version IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Attendance conflict: reload the session before saving' USING ERRCODE='40001'; END IF;
    IF previous.status IS NOT DISTINCT FROM next_status THEN CONTINUE; END IF;
    after_row:=NULL;
    IF next_status IS NULL THEN DELETE FROM public.attendance WHERE youth_id=target_youth AND session_date=target_date;
    ELSE
      INSERT INTO public.attendance(youth_id,session_date,status,recorded_by,version)
      VALUES(target_youth,target_date,next_status,actor,nextval('public.attendance_version_seq'))
      ON CONFLICT(youth_id,session_date) DO UPDATE SET status=excluded.status,recorded_by=actor,version=excluded.version;
      SELECT to_jsonb(a) INTO after_row FROM public.attendance a WHERE youth_id=target_youth AND session_date=target_date;
    END IF;
    INSERT INTO public.attendance_audit(operation_id,auth_user_id,servant_id,youth_id,session_date,before_value,after_value,reason_category,reason_notes)
    VALUES(p_operation_id,auth.uid(),actor,target_youth,target_date,CASE WHEN previous.id IS NULL THEN NULL ELSE to_jsonb(previous) END,after_row,coalesce(p_audit_category,''),coalesce(p_audit_notes,''));
    count_changed:=count_changed+1;
  END LOOP;
  INSERT INTO public.processed_operations(id,auth_user_id,kind,payload_hash,result)
  VALUES(p_operation_id,auth.uid(),'attendance',fingerprint,jsonb_build_object('success',true,'count',count_changed));
  RETURN jsonb_build_object('success',true,'count',count_changed);
END $$;

CREATE OR REPLACE FUNCTION public.claim_daily_follow_up_task(p_youth_id uuid)
RETURNS SETOF public.daily_follow_up_tasks LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE actor uuid:=public.current_servant_id(); today date:=(now() AT TIME ZONE 'Africa/Cairo')::date;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Servant access required' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('task/'||actor::text||today::text,0));
  -- An existing task remains stable after completion or changes to ranking inputs.
  IF NOT EXISTS(SELECT 1 FROM public.daily_follow_up_tasks WHERE servant_id=actor AND task_date=today) THEN
    IF NOT EXISTS(SELECT 1 FROM public.youth WHERE id=p_youth_id AND assigned_servant_id=actor AND (left_on IS NULL OR left_on>today)) THEN
      RAISE EXCEPTION 'Youth is not assigned to this servant' USING ERRCODE='42501'; END IF;
    INSERT INTO public.daily_follow_up_tasks(servant_id,youth_id,task_date) VALUES(actor,p_youth_id,today);
  END IF;
  RETURN QUERY SELECT * FROM public.daily_follow_up_tasks WHERE servant_id=actor AND task_date=today;
END $$;

CREATE OR REPLACE FUNCTION public.record_follow_up(p_operation_id uuid,p_youth_id uuid,p_method text,p_outcome text,p_notes text,p_contacted_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE actor uuid:=public.current_servant_id(); contact_day date:=(p_contacted_at AT TIME ZONE 'Africa/Cairo')::date;
  cached public.processed_operations%ROWTYPE;
  fingerprint text:=md5(jsonb_build_object('youth',p_youth_id,'method',p_method,'outcome',p_outcome,'notes',p_notes,'contacted_at',extract(epoch FROM p_contacted_at))::text);
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Servant access required' USING ERRCODE='42501'; END IF;
  IF p_operation_id IS NULL THEN RAISE EXCEPTION 'Invalid operation ID' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_operation_id::text,0));
  SELECT * INTO cached FROM public.processed_operations WHERE id=p_operation_id;
  IF FOUND THEN
    IF cached.auth_user_id<>auth.uid() OR cached.kind<>'contact' OR cached.payload_hash<>fingerprint THEN RAISE EXCEPTION 'Operation ID reused' USING ERRCODE='22023'; END IF;
    RETURN cached.result;
  END IF;
  IF p_method NOT IN ('call','whatsapp') OR p_method IS NULL OR
    p_outcome IS NULL OR p_outcome NOT IN ('exams_study','illness_health','travel_relocation','spiritual_lukewarm','unreachable','family_circumstance','encouraged_attending') OR
    p_contacted_at IS NULL OR p_contacted_at>now()+interval '5 minutes' OR p_contacted_at<now()-interval '90 days' THEN
    RAISE EXCEPTION 'Invalid follow-up operation' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.youth WHERE id=p_youth_id AND (assigned_servant_id=actor OR public.is_admin()) AND (left_on IS NULL OR left_on>contact_day)) THEN
    RAISE EXCEPTION 'Contact access denied' USING ERRCODE='42501'; END IF;
  INSERT INTO public.follow_up_logs(id,youth_id,servant_id,contact_date,method,outcome,notes,contacted_at)
  VALUES(p_operation_id,p_youth_id,actor,contact_day,p_method,p_outcome,coalesce(p_notes,''),p_contacted_at);
  UPDATE public.youth SET last_contacted_at=greatest(last_contacted_at,p_contacted_at) WHERE id=p_youth_id;
  UPDATE public.daily_follow_up_tasks SET completed_at=coalesce(completed_at,p_contacted_at) WHERE servant_id=actor AND youth_id=p_youth_id AND task_date=contact_day;
  INSERT INTO public.processed_operations(id,auth_user_id,kind,payload_hash,result) VALUES(p_operation_id,auth.uid(),'contact',fingerprint,jsonb_build_object('success',true));
  RETURN jsonb_build_object('success',true);
END $$;

REVOKE ALL ON FUNCTION public.current_servant_id(),public.is_admin(),public.is_servant(),public.protect_servant_identity(),
  public.record_attendance_changes(uuid,jsonb,text,text),public.record_follow_up(uuid,uuid,text,text,text,timestamptz),public.claim_daily_follow_up_task(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.track_school_year(),public.promote_academic_year(),public.academic_year_start(date),public.validate_service_schedule() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.current_servant_id(),public.is_admin(),public.is_servant(),
  public.record_attendance_changes(uuid,jsonb,text,text),public.record_follow_up(uuid,uuid,text,text,text,timestamptz),public.claim_daily_follow_up_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_academic_year() TO authenticated;
REVOKE ALL ON SEQUENCE public.attendance_version_seq FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.attendance_audit_id_seq FROM PUBLIC,anon,authenticated;
DO $$ DECLARE table_name text; BEGIN
  IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    FOREACH table_name IN ARRAY ARRAY['attendance','youth','servants','service_schedules','follow_up_logs','daily_follow_up_tasks'] LOOP
      IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=table_name) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',table_name);
      END IF;
    END LOOP;
  END IF;
END $$;
COMMIT;
