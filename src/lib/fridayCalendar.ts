import { formatDateArabic, toLocalDateString, parseLocalDate } from '@/lib/utils';
import { Attendance } from '@/types/database';

export type LifecycleState = 'upcoming' | 'live' | 'grace' | 'locked';

export interface FridaySessionMeta {
  date: string; // ISO 'YYYY-MM-DD'
  displayDay: string; // e.g. "25"
  displayMonth: string; // e.g. "سبتمبر"
  fullLabel: string;
  liturgicalTag?: string;
  tagType: 'feast' | 'exams' | 'retreat' | 'regular';
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
 * Known liturgical, feast, and academic calendar markers for Church Middle School Youth
 */
const KNOWN_SEASONAL_EVENTS: Record<string, { tag: string; type: 'feast' | 'exams' | 'retreat' | 'regular' }> = {
  // September
  '2026-09-18': { tag: 'بدء العام الكنسي والدراسي', type: 'regular' },
  '2026-09-25': { tag: 'عيد الصليب المجيد ✝️', type: 'feast' },
  // October
  '2026-10-02': { tag: 'لقاء بناء الصداقات والمحبة', type: 'regular' },
  '2026-10-09': { tag: 'احتفالية المتفوقين دراسياً', type: 'retreat' },
  '2026-10-16': { tag: 'ورشة القيادة والمسابقات', type: 'regular' },
  '2026-10-23': { tag: 'لقاء الصلاة الشخصية', type: 'regular' },
  '2026-10-30': { tag: 'استعداد امتحانات الشهر', type: 'exams' },
  // November
  '2026-11-06': { tag: 'أسبوع الميدتيرم الأول 📚', type: 'exams' },
  '2026-11-13': { tag: 'لقاء التحديات وسن المراهقة', type: 'regular' },
  '2026-11-20': { tag: 'مسابقة سفر الملوك الثاني', type: 'regular' },
  '2026-11-27': { tag: 'بدء صوم الميلاد المجيد 🕊️', type: 'feast' },
  // December
  '2026-12-04': { tag: 'تسابيح شهر كيهك المبارك', type: 'feast' },
  '2026-12-11': { tag: 'سهرة كيهكية للشباب ✨', type: 'feast' },
  '2026-12-18': { tag: 'استعداد امتحانات نصف العام', type: 'exams' },
  '2026-12-25': { tag: 'لقاء ترانيم وموسيقى الميلاد', type: 'feast' },
};

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
  let dayOfWeek = startDate.getDay();
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
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
      termLabel = 'فصل نصف العام والصوم الكبير';
    } else {
      term = 'summer';
      termLabel = 'فصل الخماسين والنشاط الصيفي';
    }

    const dayNumber = String(fDate.getDate());
    const monthArabic = new Intl.DateTimeFormat('ar-EG', { month: 'short' }).format(fDate);
    const event = KNOWN_SEASONAL_EVENTS[isoStr] || {
      tag: 'اجتماع أسبوعي عادي',
      type: 'regular' as const,
    };

    const lifecycle = getSessionLifecycleState(isoStr, referenceDate);

    fridays.push({
      date: isoStr,
      displayDay: dayNumber,
      displayMonth: monthArabic,
      fullLabel: `جمعة ${dayNumber} ${monthArabic}`,
      liturgicalTag: event.tag,
      tagType: event.type,
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
