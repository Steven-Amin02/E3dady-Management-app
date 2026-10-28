import type { Attendance, AttendanceChange, AttendanceDraftChange, AttendanceStatus, Youth } from '@/types/database';
import { precedingFriday, addDays, serviceDate, academicYearStart } from '@/lib/serviceDate';

export interface AttendanceIndex {
  byKey: Map<string, Attendance>;
  byYouth: Map<string, Attendance[]>;
  byDate: Map<string, Attendance[]>;
}
const indexes = new WeakMap<Attendance[], AttendanceIndex>();
export const attendanceKey = (youthId: string, date: string) => `${youthId}/${date}`;
export const schoolYearAt = (youth: Youth, date: string) => youth.school_year_history
  ? youth.school_year_history[academicYearStart(date)] : youth.school_year;

export function indexAttendance(records: Attendance[]): AttendanceIndex {
  const cached = indexes.get(records);
  if (cached) return cached;
  const byKey = new Map<string, Attendance>();
  const byYouth = new Map<string, Attendance[]>();
  const byDate = new Map<string, Attendance[]>();
  for (const record of records) byKey.set(attendanceKey(record.youth_id, record.session_date), record);
  for (const record of byKey.values()) {
    const list = byYouth.get(record.youth_id) ?? [];
    list.push(record);
    byYouth.set(record.youth_id, list);
    const session = byDate.get(record.session_date) ?? [];
    session.push(record); byDate.set(record.session_date, session);
  }
  for (const list of byYouth.values()) list.sort((a, b) => b.session_date.localeCompare(a.session_date));
  const index = { byKey, byYouth, byDate };
  indexes.set(records, index);
  return index;
}

export function eligibleYouth(youth: Youth[], date: string): Youth[] {
  return youth.filter(y => (!y.joined_on || y.joined_on <= date) && (!y.left_on || y.left_on > date))
    .map(y => y.school_year_history?.[academicYearStart(date)] ? { ...y, school_year: y.school_year_history[academicYearStart(date)] } : y);
}

export function fridayWindow(count: number, referenceDate = serviceDate()): string[] {
  const friday = precedingFriday(referenceDate, true);
  return Array.from({ length: count }, (_, i) => addDays(friday, (i - count + 1) * 7));
}

export function consecutiveAbsences(youthId: string, records: Attendance[], referenceDate = serviceDate()): number {
  const index = indexAttendance(records);
  let count = 0;
  let date = precedingFriday(referenceDate, true);
  while (count < 12 && index.byKey.get(attendanceKey(youthId, date))?.status === 'absent') {
    count++;
    date = addDays(date, -7);
  }
  return count;
}

export function editDraft(
  previous: Record<string, AttendanceDraftChange>, records: Attendance[], date: string,
  edits: Record<string, AttendanceStatus | null>,
): Record<string, AttendanceDraftChange> {
  const next = { ...previous };
  const index = indexAttendance(records);
  for (const [id, status] of Object.entries(edits)) {
    const row = index.byKey.get(attendanceKey(id, date));
    const base = previous[id] ?? {
      youth_id: id, session_date: date, expected_version: row?.version ?? null,
      base_status: row?.status ?? null, status,
    };
    if (status === base.base_status) delete next[id];
    else next[id] = { ...base, status };
  }
  return next;
}

export function applyAttendanceChanges(records: Attendance[], changes: AttendanceChange[], actor: string): Attendance[] {
  const map = new Map(indexAttendance(records).byKey);
  for (const change of changes) {
    const key = attendanceKey(change.youth_id, change.session_date);
    if (change.status === null) map.delete(key);
    else map.set(key, {
      ...map.get(key), id: map.get(key)?.id ?? key,
      youth_id: change.youth_id, session_date: change.session_date,
      status: change.status, recorded_by: actor, pending: true,
    });
  }
  return [...map.values()];
}
