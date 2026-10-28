import { supabase } from '@/lib/supabase';
import type { PendingOperation } from '@/lib/outbox';
import type { Json } from '@/types/supabase';
import { academicYearStart, serviceDate } from '@/lib/serviceDate';
import { fridayWindow } from '@/lib/attendanceModel';
export function requireClient() {
  if (!supabase) throw new Error('لم يتم إعداد اتصال قاعدة البيانات');
  return supabase;
}
export async function allPages<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const result: T[] = [], size = 200;
  for (let offset = 0; ; offset += size) {
    const response = await page(offset, offset + size - 1);
    if (response.error) throw response.error;
    if (!response.data) throw new Error('لم تصل استجابة صالحة من قاعدة البيانات');
    result.push(...response.data);
    if (response.data.length < size) return result;
  }
}
export async function fetchSnapshot() {
  const client = requireClient(), today = serviceDate();
  const start = [academicYearStart(today), fridayWindow(12, today)[0]].sort()[0];
  const [servants, rawYouth, attendance, schedules, followUpLogs, tasks, years] = await Promise.all([
    allPages((from, to) => client.from('servants').select('*').order('id').range(from, to)),
    allPages((from, to) => client.from('youth').select('*').order('id').range(from, to)),
    allPages((from, to) => client.from('attendance').select('*').gte('session_date', start).lte('session_date', today).order('session_date').order('youth_id').range(from, to)),
    allPages((from, to) => client.from('service_schedules').select('*').order('date', { ascending: false }).order('id').range(from, to)),
    allPages((from, to) => client.from('follow_up_logs').select('*').gte('contact_date', start).order('id').range(from, to)),
    allPages((from, to) => client.from('daily_follow_up_tasks').select('*').eq('task_date', today).order('id').range(from, to)),
    allPages((from, to) => client.from('youth_school_years').select('*').order('academic_year_start').order('youth_id').range(from, to)),
  ]);
  const youth = rawYouth.map(y => ({ ...y, school_year_history: Object.fromEntries(years.filter(year => year.youth_id === y.id).map(year => [year.academic_year_start, year.school_year])) as Record<string, typeof y.school_year> }));
  return { servants, youth, attendance, schedules, followUpLogs, tasks, attendanceRange: { from: start, to: today }, loadedSessionDates: [] as string[] };
}
export type Snapshot = Awaited<ReturnType<typeof fetchSnapshot>>;
export const emptySnapshot = (): Snapshot => ({ servants: [], youth: [], attendance: [], schedules: [], followUpLogs: [], tasks: [], attendanceRange: { from: '', to: '' }, loadedSessionDates: [] });
export async function fetchSession(date: string) {
  return allPages((from, to) => requireClient().from('attendance').select('*').eq('session_date', date).order('youth_id').range(from, to));
}
export async function fetchAttendanceRange(start: string, end: string) {
  return allPages((from, to) => requireClient().from('attendance').select('*').gte('session_date', start).lte('session_date', end).order('session_date').order('youth_id').range(from, to));
}
export async function sendOperation(operation: PendingOperation): Promise<void> {
  const client = requireClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (user?.id !== operation.userId) throw new Error('تغير الحساب؛ أعد تسجيل الدخول لمزامنة التغييرات');
  const response = operation.kind === 'attendance'
    ? await client.rpc('record_attendance_changes', { p_operation_id: operation.id,
      p_changes: operation.changes as unknown as Json, p_audit_category: operation.auditCategory, p_audit_notes: operation.auditNotes })
    : await client.rpc('record_follow_up', { p_operation_id: operation.id, p_youth_id: operation.youthId,
      p_method: operation.method, p_outcome: operation.outcome, p_notes: operation.notes, p_contacted_at: operation.contactedAt });
  if (response.error) throw response.error;
}
