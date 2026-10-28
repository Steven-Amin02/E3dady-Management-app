import { serviceDate, dateDistance, academicYearStart, addDays, upcomingFriday } from '@/lib/serviceDate';
import { Attendance } from '@/types/database';
import { indexAttendance } from '@/lib/attendanceModel';

export type LifecycleState = 'upcoming' | 'live' | 'grace' | 'locked';

export interface FridaySessionMeta {
  date: string; // ISO 'YYYY-MM-DD'
  displayDay: string; // e.g. "25"
  displayMonth: string; // e.g. "سبتمبر"
  fullLabel: string;
  liturgicalTag?: string;
  tagType?: 'feast' | 'exams' | 'retreat' | 'regular';
  term: 'fall' | 'lent' | 'summer';
  termLabel: string;
  lifecycleState: LifecycleState;
  lifecycleLabel: string;
}

export type AuditReasonCategory =
  | 'guardian_verified'
  | 'clerical_correction'
  | 'late_arrival_verified'
  | 'medical_family_excuse'
  | 'other';

export const AUDIT_REASON_OPTIONS: { id: AuditReasonCategory; label: string; icon: string }[] = [
  { id: 'guardian_verified', label: 'تأكيد عذر متأخر من ولي الأمر', icon: '📞' },
  { id: 'medical_family_excuse', label: 'ظرف صحي أو عائلي طارئ', icon: '🏥' },
  { id: 'late_arrival_verified', label: 'حضور متأخر موثق أثناء اللقاء', icon: '⏱️' },
  { id: 'clerical_correction', label: 'تصحيح خطأ رصدي غير مقصود', icon: '📝' },
  { id: 'other', label: 'سبب استثنائي آخر (مع تدوين ملاحظة)', icon: '🔍' },
];

/**
 * Determine lifecycle state of a Friday meeting based on reference date/time
 */
export function getSessionLifecycleState(sessionDateStr: string, now = new Date()): {
  state: LifecycleState;
  label: string;
} {
  const diffDays = dateDistance(serviceDate(now), sessionDateStr);

  if (diffDays < 0) {
    return { state: 'upcoming', label: 'مجدول قادماً' };
  } else if (diffDays === 0) {
    return { state: 'live', label: 'جلسة نشطة (مباشر)' };
  } else if (diffDays === 1 || diffDays === 2) {
    // Saturday (1) or Sunday (2)
    return { state: 'grace', label: 'مراجعة الأعذار (فترة سماح)' };
  } else {
    // Monday onwards
    return { state: 'locked', label: 'مؤرشف ومقفل' };
  }
}


/**
 * Generates the full academic year Friday sessions list (from September to August)
 */
export function generateAcademicFridays(referenceDate = new Date()): FridaySessionInfo[] {
  const start = academicYearStart(serviceDate(referenceDate));
  const end = `${Number(start.slice(0, 4)) + 1}-09-01`;
  const fridays: FridaySessionInfo[] = [];
  for (let isoStr = upcomingFriday(start); isoStr < end; isoStr = addDays(isoStr, 7)) {
    const fDate = new Date(isoStr + 'T12:00:00Z');
    const month = fDate.getUTCMonth();

    // Trimester classification
    let term: 'fall' | 'lent' | 'summer' = 'fall';
    let termLabel = 'فصل الخريف والدراسة';

    if (month >= 8 && month <= 11) {
      term = 'fall';
      termLabel = 'فصل الخريف والدراسة';
    } else if (month >= 0 && month <= 3) {
      term = 'lent';
      termLabel = 'نصف العام';
    } else {
      term = 'summer';
      termLabel = 'فصل الخماسين والنشاط الصيفي';
    }

    const dayNumber = String(fDate.getUTCDate());
    const monthArabic = new Intl.DateTimeFormat('ar-EG', { month: 'short', timeZone: 'UTC' }).format(fDate);
    const lifecycle = getSessionLifecycleState(isoStr, referenceDate);

    fridays.push({
      date: isoStr,
      displayDay: dayNumber,
      displayMonth: monthArabic,
      fullLabel: `جمعة ${dayNumber} ${monthArabic}`,
      term,
      termLabel,
      lifecycleState: lifecycle.state,
      lifecycleLabel: lifecycle.label,
    });
  }

  return fridays;
}

export type FridaySessionInfo = FridaySessionMeta;

/**
 * Calculates turnout percentage and counts for a specific Friday from attendance array
 */
export function getFridayTurnoutStats(attendance: Attendance[], youthCount: number, sessionDate: string) {
  const sessionRecords = indexAttendance(attendance).byDate.get(sessionDate) ?? [];
  const presentCount = sessionRecords.filter((a) => a.status === 'present').length;
  const absentCount = sessionRecords.filter((a) => a.status === 'absent').length;
  const excusedCount = sessionRecords.filter((a) => a.status === 'excused').length;
  const recordedTotal = presentCount + absentCount + excusedCount;

  const percentage = youthCount > 0 ? Math.round((presentCount / youthCount) * 100) : 0;
  const isRecorded = recordedTotal > 0;
  const completion: 'empty' | 'partial' | 'complete' = recordedTotal === 0
    ? 'empty'
    : recordedTotal < youthCount
      ? 'partial'
      : 'complete';

  // Turnout color classification
  let health: 'emerald' | 'indigo' | 'amber' | 'neutral' = 'neutral';
  if (!isRecorded) {
    health = 'neutral';
  } else if (percentage >= 80) {
    health = 'emerald';
  } else if (percentage >= 65) {
    health = 'indigo';
  } else {
    health = 'amber';
  }

  return {
    presentCount,
    absentCount,
    excusedCount,
    recordedTotal,
    percentage,
    isRecorded,
    completion,
    health,
  };
}
