import { Youth, Attendance, AttendanceStatus, PastoralTriageCategory } from '@/types/database';
import {
  evaluateYouthPastoralRisk,
  calculateMemberSparkline,
  MemberSparklineMetrics,
} from '@/lib/pastoralAnalytics';
import { toLocalDateString, parseLocalDate } from '@/lib/utils';

export interface DailyFollowUpCandidate {
  youth: Youth;
  lastFridayDate: string;
  lastFridayStatus: AttendanceStatus | 'unrecorded';
  isAbsentLastFriday: boolean;
  alreadyContactedToday: boolean;
  selectionReason: string;
  priorityRank: 1 | 2 | 3 | 4 | 5;
  triageCategory: PastoralTriageCategory;
  triageTag: string;
  consecutiveAbsences: number;
  recentRate: number;
  sparklineMetrics?: MemberSparklineMetrics;
}

/**
 * Deterministic string hash (djb2 variant) to ensure daily consistency
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit int
  }
  return Math.abs(hash);
}

/**
 * Calculates the preceding Friday date string (YYYY-MM-DD)
 */
export function getPrecedingFridayDate(referenceDate = new Date()): string {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0 is Sunday, 5 is Friday
  let diff = (day + 7 - 5) % 7;
  if (diff === 0) {
    diff = 7; // If today is Friday, the previous completed meeting was 7 days ago
  }
  d.setDate(d.getDate() - diff);
  return toLocalDateString(d);
}

/**
 * Deterministic Daily 1-Person Selector with Pastoral Risk Triage Routing
 * 
 * Rules & Hierarchical Priorities:
 * 1. Filter only youth where assigned_servant_id === servantId
 * 2. Priority 1: Critical Dropout (🔴 3+ consecutive absences) and not contacted in the last 4 days
 * 3. Priority 2: Newcomer Retention Window (🟠 joined recently, missed last 2) and not contacted since absence
 * 4. Priority 3: Fading Regular (🟡 historical regular whose recent 6 weeks dropped < 40%) and not contacted in 7 days
 * 5. Priority 4: Absent last Friday and NOT contacted since that Friday
 * 6. Priority 5: Fair Round-Robin (oldest last_contacted_at, NULLs first)
 * 7. Deterministic tie-breaker seeded by (servantId + targetDate + youth.id)
 */
export function selectDailyFollowUpYouth(
  assignedYouth: Youth[],
  attendance: Attendance[],
  servantId: string,
  targetDateStr?: string
): DailyFollowUpCandidate | null {
  if (!assignedYouth || assignedYouth.length === 0 || !servantId) {
    return null;
  }

  const todayStr = targetDateStr || toLocalDateString(new Date());
  const todayDate = parseLocalDate(todayStr);
  const todayTimestamp = todayDate.getTime();
  const lastFridayDate = getPrecedingFridayDate(todayDate);
  const lastFridayTimestamp = parseLocalDate(lastFridayDate).getTime();

  // Filter only youth assigned to this servant
  const myYouth = assignedYouth.filter((y) => y.assigned_servant_id === servantId);
  if (myYouth.length === 0) return null;

  // Build candidate items with automated pastoral risk triage evaluation
  const candidates: DailyFollowUpCandidate[] = myYouth.map((y) => {
    // Check attendance for last Friday
    const lastAtt = attendance.find(
      (a) => a.youth_id === y.id && a.session_date === lastFridayDate
    );
    const lastFridayStatus: AttendanceStatus | 'unrecorded' = lastAtt ? lastAtt.status : 'unrecorded';
    const isAbsentLastFriday = lastFridayStatus === 'absent';

    // Contact time calculations
    const contactTimestamp = y.last_contacted_at ? new Date(y.last_contacted_at).getTime() : 0;
    const contactedToday = Boolean(
      y.last_contacted_at && y.last_contacted_at.startsWith(todayStr)
    );
    const contactedSinceAbsence = contactTimestamp >= lastFridayTimestamp;
    const daysSinceContact = contactTimestamp > 0
      ? Math.floor((todayTimestamp - contactTimestamp) / (1000 * 60 * 60 * 24))
      : 999;

    // Evaluate Pastoral Risk Triage
    const triage = evaluateYouthPastoralRisk(y, attendance, lastFridayDate);
    const sparkline = calculateMemberSparkline(y.id, attendance, 12, lastFridayDate);

    // Determine Priority Rank based on Triage Category
    let priorityRank: 1 | 2 | 3 | 4 | 5 = 5;
    let selectionReason = 'دورية المتابعة العادلة (أقدم تاريخ تواصل)';

    // Priority 1: Critical Dropout (🔴 3+ consecutive absences)
    if (triage.category === 'critical_dropout' && daysSinceContact >= 4) {
      priorityRank = 1;
      selectionReason = `خطر انقطاع تام: غياب ${triage.consecutiveAbsences} أسابيع متتالية دون تواصل مؤخراً`;
    }
    // Priority 2: Newcomer Retention Window (🟠 joined recently, missed last 2)
    else if (triage.category === 'newcomer_risk' && !contactedSinceAbsence) {
      priorityRank = 2;
      selectionReason = 'مخدوم جديد في مرحلة التثبيت: غاب عن آخر أسبوعين ويحتاج دعماً رعوياً';
    }
    // Priority 3: Fading Regular (🟡 engagement drop)
    else if (triage.category === 'fading_regular' && daysSinceContact >= 7) {
      priorityRank = 3;
      selectionReason = `فتور تدريجي: تراجع ملحوظ في الحضور (${triage.recentRate}%) مقارنة بالتزامه السابق`;
    }
    // Priority 4: Absent last Friday and not yet contacted
    else if (isAbsentLastFriday && !contactedSinceAbsence) {
      priorityRank = 4;
      selectionReason = 'غائب في الجمعة الماضية ولم يتم افتقاده بعد';
    }
    // Priority 5: Fair Round-Robin
    else if (!y.last_contacted_at) {
      priorityRank = 5;
      selectionReason = 'لم يتم افتقاده من قبل (دورية المتابعة العادلة)';
    }

    return {
      youth: y,
      lastFridayDate,
      lastFridayStatus,
      isAbsentLastFriday,
      alreadyContactedToday: contactedToday,
      selectionReason,
      priorityRank,
      triageCategory: triage.category,
      triageTag: triage.meta.tag,
      consecutiveAbsences: triage.consecutiveAbsences,
      recentRate: triage.recentRate,
      sparklineMetrics: sparkline,
    };
  });

  // Sort deterministically
  candidates.sort((a, b) => {
    // 1. Priority rank (1 highest urgency to 5 lowest)
    if (a.priorityRank !== b.priorityRank) {
      return a.priorityRank - b.priorityRank;
    }

    // 2. Oldest contact date (nulls first)
    const timeA = a.youth.last_contacted_at ? new Date(a.youth.last_contacted_at).getTime() : 0;
    const timeB = b.youth.last_contacted_at ? new Date(b.youth.last_contacted_at).getTime() : 0;
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    // 3. Consecutive absences (more absences first within same priority)
    if (a.consecutiveAbsences !== b.consecutiveAbsences) {
      return b.consecutiveAbsences - a.consecutiveAbsences;
    }

    // 4. Deterministic hash tie-breaker based on servantId + todayStr + youth.id
    const hashA = hashString(`${servantId}_${todayStr}_${a.youth.id}`);
    const hashB = hashString(`${servantId}_${todayStr}_${b.youth.id}`);
    return hashA - hashB;
  });

  return candidates[0] || null;
}
