import { toLocalDateString, parseLocalDate } from '@/lib/utils';
import { Attendance } from '@/types/database';

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
  const sessionDate = parseLocalDate(sessionDateStr);
  sessionDate.setHours(0, 0, 0, 0);
  const sessionFridayTime = sessionDate.getTime();

  // Strip time from now using local date
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const nowTime = today.getTime();

  const diffDays = Math.round((nowTime - sessionFridayTime) / (1000 * 60 * 60 * 24));

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
  const currentYear = referenceDate.getFullYear();
  // Start from September of (currentYear - (currentMonth < 8 ? 1 : 0))
  const currentMonth = referenceDate.getMonth(); // 0-indexed, 8 is September
  const startYear = currentMonth >= 8 ? currentYear : currentYear - 1;

  // Let's generate 40 consecutive Fridays spanning September through June/July
  const startDate = new Date(startYear, 8, 1, 12, 0, 0); // Sept 1st noon to avoid offset shift
  // Find first Friday in September
  const dayOfWeek = startDate.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  startDate.setDate(startDate.getDate() + daysUntilFriday);

  const fridays: FridaySessionInfo[] = [];

  for (let i = 0; i < 36; i++) {
    const fDate = new Date(startDate);
    fDate.setDate(startDate.getDate() + i * 7);

    const isoStr = toLocalDateString(fDate);
    const month = fDate.getMonth(); // 0 to 11

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

    const dayNumber = String(fDate.getDate());
    const monthArabic = new Intl.DateTimeFormat('ar-EG', { month: 'short' }).format(fDate);
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
  const sessionRecords = attendance.filter((a) => a.session_date === sessionDate);
  const presentCount = sessionRecords.filter((a) => a.status === 'present').length;
  const absentCount = sessionRecords.filter((a) => a.status === 'absent').length;
  const excusedCount = sessionRecords.filter((a) => a.status === 'excused').length;
  const recordedTotal = presentCount + absentCount + excusedCount;

  const percentage = youthCount > 0 ? Math.round((presentCount / youthCount) * 100) : 0;
  const isRecorded = recordedTotal > 0;

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
    health,
  };
}
