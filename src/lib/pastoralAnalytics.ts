import { Attendance, AttendanceStatus, PastoralOutcomeCategory, PastoralTriageCategory, Youth } from '@/types/database';
import { serviceDate, dateDistance, dayOfWeek } from '@/lib/serviceDate';
import { indexAttendance, attendanceKey, fridayWindow, consecutiveAbsences as countAbsences } from '@/lib/attendanceModel';

/**
 * Metadata & UI configuration for Pastoral Contact Outcomes
 */
export interface PastoralOutcomeMeta {
  id: PastoralOutcomeCategory;
  label: string;
  shortLabel: string;
  icon: string;
  colorClass: string;
  badgeBg: string;
  description: string;
}

export const PASTORAL_OUTCOME_OPTIONS: PastoralOutcomeMeta[] = [
  {
    id: 'exams_study',
    label: 'مذاكرة وامتحانات دراسية',
    shortLabel: 'امتحانات',
    icon: '📚',
    colorClass: 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200',
    description: 'انشغال بالمذاكرة، دروس خصوصية، أو امتحانات شهرية',
  },
  {
    id: 'illness_health',
    label: 'ظروف صحية أو مرض',
    shortLabel: 'ظرف صحي',
    icon: '🩺',
    colorClass: 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50',
    badgeBg: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200',
    description: 'وعكة صحية أو مريض في المنزل يحتاج صلاة ورعاية',
  },
  {
    id: 'travel_relocation',
    label: 'سفر أو خارج المحافظة',
    shortLabel: 'سفر',
    icon: '🚗',
    colorClass: 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200',
    description: 'مسافر مع الأسرة أو خارج البلدة خلال عطلة الأسبوع',
  },
  {
    id: 'spiritual_lukewarm',
    label: 'فتور روحي وبعد تدريجي',
    shortLabel: 'فتور روحي',
    icon: '🕊️',
    colorClass: 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50',
    badgeBg: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200',
    description: 'يحتاج تشجيعاً خاصاً وزيارة افتقاد دافئة لإعادة الحماس',
  },
  {
    id: 'unreachable',
    label: 'حاولت ولم يرد / الهاتف مغلق',
    shortLabel: 'لم يرد',
    icon: '📵',
    colorClass: 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50',
    badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    description: 'تم الاتصال ولم يقم بالرد أو رقم الهاتف غير متاح حالياً',
  },
  {
    id: 'family_circumstance',
    label: 'ظروف أسرية أو خاصة',
    shortLabel: 'ظرف أسري',
    icon: '🏠',
    colorClass: 'text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50',
    badgeBg: 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200',
    description: 'مناسبة أو ظرف عائلي حال دون حضوره للاجتماع',
  },
  {
    id: 'encouraged_attending',
    label: 'تواصل مشجع ومستعد للحضور الجمعة',
    shortLabel: 'حاضر الجمعة',
    icon: '✅',
    colorClass: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200',
    description: 'تم الافتقاد بنجاح وأكد حضوره في موعد اللقاء القادم بكل فرح',
  },
];

/**
 * Metadata & UI configuration for Pastoral Risk Categories
 */
export interface PastoralTriageMeta {
  id: PastoralTriageCategory;
  title: string;
  badgeText: string;
  tag: string;
  icon: string;
  severity: 'critical' | 'warning' | 'info' | 'normal';
  colorBorder: string;
  colorBg: string;
  colorText: string;
  actionRecommendation: string;
}

export const PASTORAL_TRIAGE_CONFIG: Record<PastoralTriageCategory, PastoralTriageMeta> = {
  critical_dropout: {
    id: 'critical_dropout',
    title: 'خطر الانقطاع التام (٣+ أسابيع)',
    badgeText: 'خطر انقطاع',
    tag: '🔴 خطر انقطاع تام',
    icon: '🔴',
    severity: 'critical',
    colorBorder: 'border-rose-500/50 dark:border-rose-500/40',
    colorBg: 'bg-rose-500/10 dark:bg-rose-950/30',
    colorText: 'text-rose-700 dark:text-rose-400',
    actionRecommendation: 'تدخل رعوي عاجل: زيارة منزلية أو اتصال مباشر من أمين الخدمة لكسر حاجز الغياب الطويل.',
  },
  newcomer_risk: {
    id: 'newcomer_risk',
    title: 'مخدوم جديد معرض للانقطاع',
    badgeText: 'تثبيت الجدد',
    tag: '🟠 مخدوم جديد',
    icon: '🟠',
    severity: 'warning',
    colorBorder: 'border-amber-500/50 dark:border-amber-500/40',
    colorBg: 'bg-amber-500/10 dark:bg-amber-950/30',
    colorText: 'text-amber-700 dark:text-amber-400',
    actionRecommendation: 'نافذة التثبيت (أول ٤٥ يوماً): غياب مرتين متتاليتين يفقده الارتباط؛ يحتاج ترحيباً وصداقة فورية.',
  },
  fading_regular: {
    id: 'fading_regular',
    title: 'فتور تدريجي وتراجع الحضور',
    badgeText: 'فتور تدريجي',
    tag: '🟡 فتور تدريجي',
    icon: '🟡',
    severity: 'warning',
    colorBorder: 'border-yellow-500/50 dark:border-yellow-500/40',
    colorBg: 'bg-yellow-500/10 dark:bg-yellow-950/30',
    colorText: 'text-yellow-700 dark:text-yellow-400',
    actionRecommendation: 'تراجع ملحوظ بعد فترة التزام: محادثة تفقدية للوقوف على أسباب الفتور (صداقات، دراسة، ضغوط).',
  },
  regular_active: {
    id: 'regular_active',
    title: 'حضور منتظم ومستقر',
    badgeText: 'منتظم',
    tag: '🟢 منتظم',
    icon: '🟢',
    severity: 'normal',
    colorBorder: 'border-emerald-500/30 dark:border-emerald-500/20',
    colorBg: 'bg-emerald-500/5 dark:bg-emerald-950/20',
    colorText: 'text-emerald-700 dark:text-emerald-400',
    actionRecommendation: 'حضور مشجع ومستمر: تشجيعه على المشاركة في الأنشطة والمسابقات والصلوات.',
  },
};

/**
 * Calculates an array of the last N Friday dates ending on or immediately before referenceDate.
 * Sorted chronologically (oldest to newest).
 */
export function getPastFridayDates(count = 12, referenceDateStr?: string): string[] {
  return fridayWindow(count, referenceDateStr ?? serviceDate());
}

/**
 * Longitudinal Sparkline Session item
 */
export interface SparklineSession {
  date: string;
  dayMonth: string; // e.g. "25 سبت"
  status: AttendanceStatus | 'unrecorded';
  recordedBy?: string | null;
}

export interface MemberSparklineMetrics {
  sessions: SparklineSession[];
  attendedCount: number;
  absentCount: number;
  excusedCount: number;
  recordedTotal: number;
  totalWindow: number;
  consistencyFraction: string; // e.g. "10/12"
  attendanceRate: number; // percentage in this 12-week window
  streakType: 'present' | 'absent' | 'excused' | 'none';
  streakCount: number;
  streakLabel: string; // e.g. "حضور متصل 4 أسابيع 🔥" or "انقطاع 3 أسابيع ⚠️"
}

/**
 * Computes 12-week longitudinal session micro-sparkline metrics for a student
 */
const sparklineCache = new WeakMap<Attendance[], Map<string, MemberSparklineMetrics>>();
const monthFormatter = new Intl.DateTimeFormat('ar-EG', { month: 'short', timeZone: 'UTC' });
const dateLabels = new Map<string, string>();

export function calculateMemberSparkline(
  youthId: string,
  attendance: Attendance[],
  windowSize = 12,
  referenceDateStr?: string
): MemberSparklineMetrics {
  const reference = referenceDateStr ?? serviceDate();
  const cache = sparklineCache.get(attendance) ?? new Map<string, MemberSparklineMetrics>();
  sparklineCache.set(attendance, cache);
  const cacheKey = `${youthId}/${windowSize}/${reference}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const index = indexAttendance(attendance);
  const fridayDates = getPastFridayDates(windowSize, reference);

  let attendedCount = 0;
  let absentCount = 0;
  let excusedCount = 0;
  let recordedTotal = 0;

  const sessions: SparklineSession[] = fridayDates.map((fDate) => {
    const record = index.byKey.get(attendanceKey(youthId, fDate));
    const status: AttendanceStatus | 'unrecorded' = record ? record.status : 'unrecorded';

    if (record) {
      recordedTotal++;
      if (status === 'present') attendedCount++;
      else if (status === 'absent') absentCount++;
      else if (status === 'excused') excusedCount++;
    }

    // Format Arabic day & short month e.g. "25 سبتمبر"
    let label = dateLabels.get(fDate);
    if (!label) {
      const parsed = new Date(`${fDate}T12:00:00Z`);
      label = `${parsed.getUTCDate()} ${monthFormatter.format(parsed)}`;
      dateLabels.set(fDate, label);
    }

    return {
      date: fDate,
      dayMonth: label,
      status,
      recordedBy: record?.recorded_by,
    };
  });

  // Calculate current streak from newest session backward
  let streakType: 'present' | 'absent' | 'excused' | 'none' = 'none';
  let streakCount = 0;

  for (let i = sessions.length - 1; i >= 0; i--) {
    const st = sessions[i].status;
    if (st === 'unrecorded') break;

    if (streakType === 'none') {
      streakType = st;
      streakCount = 1;
    } else if (streakType === st) {
      streakCount++;
    } else {
      break;
    }
  }

  let streakLabel = 'مستقر';
  if (streakType === 'present' && streakCount >= 2) {
    streakLabel = `${streakCount} أسابيع حضور متصل 🔥`;
  } else if (streakType === 'absent' && streakCount >= 2) {
    streakLabel = `انقطاع ${streakCount} أسابيع ⚠️`;
  } else if (streakType === 'excused') {
    streakLabel = 'اعتذار مبرر 📋';
  } else if (streakCount === 1) {
    streakLabel = streakType === 'present' ? 'حاضر آخر لقاء' : 'غائب آخر لقاء';
  }

  const attendanceRate = windowSize > 0 ? Math.round((attendedCount / windowSize) * 100) : 0;
  const consistencyFraction = `${attendedCount}/${windowSize}`;

  const result: MemberSparklineMetrics = {
    sessions,
    attendedCount,
    absentCount,
    excusedCount,
    recordedTotal,
    totalWindow: windowSize,
    consistencyFraction,
    attendanceRate,
    streakType,
    streakCount,
    streakLabel,
  };
  cache.set(cacheKey, result);
  return result;
}

/**
 * Evaluated Pastoral Risk Triage Result for a Youth
 */
export interface YouthTriageEvaluation {
  category: PastoralTriageCategory;
  meta: PastoralTriageMeta;
  consecutiveAbsences: number;
  recentRate: number;
  historicalRate: number;
  isNewcomer: boolean;
  reason: string;
  priorityScore: number;
}

/**
 * Automated Pastoral Risk Triage Algorithm
 */
export function evaluateYouthPastoralRisk(
  youthItem: Youth,
  attendance: Attendance[],
  referenceDateStr?: string
): YouthTriageEvaluation {
  const reference = referenceDateStr ?? serviceDate();
  const windowStart = fridayWindow(12, reference)[0];
  const memberAttendance = (indexAttendance(attendance).byYouth.get(youthItem.id) ?? [])
    .filter(a => a.session_date >= windowStart && a.session_date <= reference && dayOfWeek(a.session_date) === 5 &&
      (!youthItem.joined_on || a.session_date >= youthItem.joined_on) && (!youthItem.left_on || a.session_date < youthItem.left_on));
  const consecutiveAbsences = countAbsences(youthItem.id, attendance, reference);

  // 2. Historical attendance rate
  const totalSessions = memberAttendance.length;
  const recentDates = new Set(fridayWindow(6, reference));
  const recent = memberAttendance.filter(a => recentDates.has(a.session_date));
  const historical = memberAttendance.filter(a => !recentDates.has(a.session_date));
  const baseline = historical.length >= 6 ? historical : memberAttendance;
  const historicalRate = baseline.length ? Math.round(baseline.filter(a => a.status === 'present').length / baseline.length * 100) : 0;

  // 3. Last 6 weeks rate
  const recentRate = recent.length ? Math.round(recent.filter(a => a.status === 'present').length / recent.length * 100) : 0;

  // 4. Newcomer check (created recently or <= 4 recorded sessions and attended at least 1)
  const createdDate = youthItem.joined_on || (youthItem.created_at ? serviceDate(new Date(youthItem.created_at)) : '');
  const daysSinceCreated = createdDate ? dateDistance(reference, createdDate) : 999;
  const isNewcomer = createdDate ? daysSinceCreated >= 0 && daysSinceCreated <= 60 : totalSessions <= 4;

  let category: PastoralTriageCategory = 'regular_active';
  let reason = 'حضور مستقر ومستمر';
  let priorityScore = 10;

  // Rule A: Critical Dropout (3+ consecutive absences)
  if (consecutiveAbsences >= 3) {
    category = 'critical_dropout';
    reason = `انقطاع لـ ${consecutiveAbsences} أسابيع متتالية؛ يحتاج تدخلاً رعوياً فورياً`;
    priorityScore = 100 + consecutiveAbsences * 5;
  }
  // Rule B: Newcomer Risk (newcomer attended 1-2 times, then missed 2 consecutive sessions)
  else if (isNewcomer && memberAttendance.some(a => a.status === 'present') && consecutiveAbsences >= 2) {
    category = 'newcomer_risk';
    reason = 'مخدوم جديد في نافذة التثبيت الأولى؛ غاب عن آخر أسبوعين ويخشى انقطاعه الدائم';
    priorityScore = 85;
  }
  // Rule C: Fading Regular (historical rate >= 70% or total >= 6, but recent 6 weeks < 45%)
  else if (historical.length >= 6 && recent.length === 6 && historicalRate >= 65 && recentRate <= 40) {
    category = 'fading_regular';
    reason = `فتور تدريجي: كان التزامه (${historicalRate}%) وتراجع مؤخراً إلى (${recentRate}%)`;
    priorityScore = 65;
  }
  // Rule D: Recent single absence
  else if (consecutiveAbsences >= 1) {
    category = 'regular_active';
    reason = 'تغيب عن اللقاء الأخير فقط';
    priorityScore = 30;
  }

  return {
    category,
    meta: PASTORAL_TRIAGE_CONFIG[category],
    consecutiveAbsences,
    recentRate,
    historicalRate,
    isNewcomer,
    reason,
    priorityScore,
  };
}

/**
 * Aggregates entire youth roster into Pastoral Triage Radar counts
 */
export function getPastoralTriageRadarSummary(
  allYouth: Youth[],
  attendance: Attendance[],
  referenceDateStr?: string
) {
  const criticalList: { youth: Youth; eval: YouthTriageEvaluation }[] = [];
  const newcomerRiskList: { youth: Youth; eval: YouthTriageEvaluation }[] = [];
  const fadingRegularList: { youth: Youth; eval: YouthTriageEvaluation }[] = [];
  const regularList: { youth: Youth; eval: YouthTriageEvaluation }[] = [];

  allYouth.forEach((y) => {
    const evaluation = evaluateYouthPastoralRisk(y, attendance, referenceDateStr);
    if (evaluation.category === 'critical_dropout') {
      criticalList.push({ youth: y, eval: evaluation });
    } else if (evaluation.category === 'newcomer_risk') {
      newcomerRiskList.push({ youth: y, eval: evaluation });
    } else if (evaluation.category === 'fading_regular') {
      fadingRegularList.push({ youth: y, eval: evaluation });
    } else {
      regularList.push({ youth: y, eval: evaluation });
    }
  });

  return {
    criticalList,
    newcomerRiskList,
    fadingRegularList,
    regularList,
    totalAtRisk: criticalList.length + newcomerRiskList.length + fadingRegularList.length,
    criticalCount: criticalList.length,
    newcomerRiskCount: newcomerRiskList.length,
    fadingRegularCount: fadingRegularList.length,
    regularCount: regularList.length,
  };
}
