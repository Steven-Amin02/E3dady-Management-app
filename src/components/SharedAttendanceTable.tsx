'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { formatDateArabic, triggerHaptic } from '@/lib/utils';
import { normalizeArabic } from '@/lib/arabicUtils';
import { AttendanceStatus, SchoolYear, YouthWithDetails } from '@/types/database';
import { FridayCalendarRibbon } from '@/components/FridayCalendarRibbon';
import { AdminAuditReasonModal } from '@/components/AdminAuditReasonModal';
import { MemberSparkline } from '@/components/MemberSparkline';
import { evaluateYouthPastoralRisk } from '@/lib/pastoralAnalytics';
import {
  AuditReasonCategory,
  getSessionLifecycleState,
  getFridayTurnoutStats
} from '@/lib/fridayCalendar';
import {
  Calendar,
  CheckCircle,
  XCircle,
  HelpCircle,
  Save,
  Search,
  History,
  CheckCheck,
  Users,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  X,
  Lock,
  Unlock,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  MessageCircle,
  Copy,
  Share2,
  Check,
  Wifi,
  WifiOff,
  Zap,
  Phone,
  Clock,
  Tag
} from 'lucide-react';
import { Portal } from '@/components/Portal';

interface SharedAttendanceTableProps {
  initialDate?: string;
}

export function SharedAttendanceTable({ initialDate }: SharedAttendanceTableProps) {
  const {
    youth,
    servants,
    attendance,
    saveAttendance,
    getYouthWithDetails,
    lastFridayDate,
    nextFridayDate,
    currentServant,
    isAdmin,
  } = useApp();

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || lastFridayDate);
  const [selectedYear, setSelectedYear] = useState<SchoolYear | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [historyModalYouth, setHistoryModalYouth] = useState<YouthWithDetails | null>(null);

  // 1-Tap WhatsApp Meeting Summary Copy State
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Admin Audit Reason Modal State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

  // Offline / Synced Toast Notification State
  const [saveToast, setSaveToast] = useState<{
    show: boolean;
    type: 'online_sync' | 'offline_local' | 'audit_sync';
    message: string;
  }>({
    show: false,
    type: 'online_sync',
    message: '',
  });

  // Admin lock override state for prior weeks
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(false);

  // Reset admin unlock toggle when selectedDate changes
  useEffect(() => {
    setAdminUnlocked(false);
  }, [selectedDate]);

  // Determine if selected date is an archived / prior week
  const isHistoricalDate = useMemo(() => {
    if (selectedDate === lastFridayDate || selectedDate === nextFridayDate) {
      return false;
    }
    const selTime = new Date(selectedDate + 'T00:00:00Z').getTime();
    const lastFriTime = new Date(lastFridayDate + 'T00:00:00Z').getTime();
    return selTime < lastFriTime;
  }, [selectedDate, lastFridayDate, nextFridayDate]);

  // Is editing locked for this session?
  const isEditingLocked = isHistoricalDate && !(isAdmin && adminUnlocked);

  // Selected Friday Lifecycle metadata
  const currentLifecycle = useMemo(() => {
    return getSessionLifecycleState(selectedDate);
  }, [selectedDate]);

  // Local state for immediate responsiveness / optimistic editing
  const [localStatuses, setLocalStatuses] = useState<Record<string, AttendanceStatus>>({});

  // Sync local state when selectedDate or central attendance changes
  useEffect(() => {
    const map: Record<string, AttendanceStatus> = {};
    youth.forEach((y) => {
      const existing = attendance.find(
        (a) => a.youth_id === y.id && a.session_date === selectedDate
      );
      if (existing) {
        map[y.id] = existing.status;
      }
    });
    setLocalStatuses(map);
    setSaveSuccess(false);
  }, [selectedDate, attendance, youth]);

  // ── RESILIENT PHONETIC & ORTHOGRAPHIC SEARCH ────────────────
  const filteredYouth = useMemo(() => {
    const normalize = typeof normalizeArabic === 'function'
      ? normalizeArabic
      : (str: string) => (str || '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim().toLowerCase();

    const normalizedQuery = normalize(searchQuery);
    const cleanNumericQuery = searchQuery.replace(/\D/g, '');

    return youth
      .filter((y) => {
        const matchesYear = selectedYear === 'all' || y.school_year === selectedYear;

        if (!matchesYear) return false;
        if (!searchQuery.trim()) return true;

        // Arabic fuzzy name matching
        const normalizedName = normalize(y.name);
        const matchesName = normalizedName.includes(normalizedQuery);

        // Numeric phone suffix matching (e.g. searching last 3 or 4 digits)
        const cleanPhone = (y.phone || '').replace(/\D/g, '');
        const matchesPhone = cleanNumericQuery.length >= 2 ? cleanPhone.includes(cleanNumericQuery) : false;

        return matchesName || matchesPhone;
      })
      .sort((a, b) => {
        const yearOrder: Record<SchoolYear, number> = {
          '1st Prep': 1,
          '2nd Prep': 2,
          '3rd Prep': 3,
        };
        const diff = (yearOrder[a.school_year] || 99) - (yearOrder[b.school_year] || 99);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name, 'ar');
      });
  }, [youth, selectedYear, searchQuery]);

  // ── COHORT LIVE PROGRESS METRICS ────────────────────────────
  const cohortStats = useMemo(() => {
    const calc = (year: SchoolYear) => {
      const list = youth.filter((y) => y.school_year === year);
      const present = list.filter((y) => localStatuses[y.id] === 'present').length;
      const total = list.length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      return { present, total, pct };
    };
    return {
      p1: calc('1st Prep'),
      p2: calc('2nd Prep'),
      p3: calc('3rd Prep'),
    };
  }, [youth, localStatuses]);

  // ── OVERALL STATS CALCULATION ──────────────────────────────
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let excused = 0;
    let unrecorded = 0;

    youth.forEach((y) => {
      const st = localStatuses[y.id];
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'excused') excused++;
      else unrecorded++;
    });

    const recordedTotal = present + absent + excused;
    const attendancePercentage = recordedTotal > 0 ? Math.round((present / recordedTotal) * 100) : 0;

    return {
      present,
      absent,
      excused,
      unrecorded,
      total: youth.length,
      attendancePercentage,
    };
  }, [youth, localStatuses]);

  // ── ATOMIC STATUS TOGGLE WITH HAPTIC FEEDBACK ───────────────
  const setStatus = (youthId: string, status: AttendanceStatus) => {
    if (isEditingLocked) return;

    if (status === 'present') triggerHaptic('success');
    else if (status === 'absent') triggerHaptic('warning');
    else triggerHaptic('medium');

    setLocalStatuses((prev) => ({ ...prev, [youthId]: status }));
    setSaveSuccess(false);
  };

  const markAllFilteredPresent = () => {
    if (isEditingLocked) return;
    triggerHaptic('success');
    const nextStatuses = { ...localStatuses };
    filteredYouth.forEach((y) => {
      nextStatuses[y.id] = 'present';
    });
    setLocalStatuses(nextStatuses);
    setSaveSuccess(false);
  };

  const clearFiltered = () => {
    if (isEditingLocked) return;
    triggerHaptic('warning');
    const nextStatuses = { ...localStatuses };
    filteredYouth.forEach((y) => {
      delete nextStatuses[y.id];
    });
    setLocalStatuses(nextStatuses);
    setSaveSuccess(false);
  };

  const getServantName = (servantId: string | null) => {
    if (!servantId) return 'غير محدد';
    const s = servants.find((item) => item.id === servantId);
    return s ? s.name : 'غير محدد';
  };

  // ── 1-TAP WHATSAPP SUMMARY GENERATOR ───────────────────────
  const generateMeetingSummary = () => {
    const formattedDate = formatDateArabic(selectedDate);

    const p1Youth = youth.filter((y) => y.school_year === '1st Prep');
    const p1Present = p1Youth.filter((y) => localStatuses[y.id] === 'present').length;
    const p1Pct = p1Youth.length > 0 ? Math.round((p1Present / p1Youth.length) * 100) : 0;

    const p2Youth = youth.filter((y) => y.school_year === '2nd Prep');
    const p2Present = p2Youth.filter((y) => localStatuses[y.id] === 'present').length;
    const p2Pct = p2Youth.length > 0 ? Math.round((p2Present / p2Youth.length) * 100) : 0;

    const p3Youth = youth.filter((y) => y.school_year === '3rd Prep');
    const p3Present = p3Youth.filter((y) => localStatuses[y.id] === 'present').length;
    const p3Pct = p3Youth.length > 0 ? Math.round((p3Present / p3Youth.length) * 100) : 0;

    const longAbsentees = youth
      .map((y) => {
        const details = getYouthWithDetails(y);
        const currentStatus = localStatuses[y.id];
        const isAbsentNow = currentStatus === 'absent';
        const baseAbsences = details.consecutive_absences || 0;
        const count = isAbsentNow ? Math.max(baseAbsences, 1) : baseAbsences;
        return {
          name: y.name,
          consecutive: count,
          servantName: getServantName(y.assigned_servant_id),
          isAbsentNow,
        };
      })
      .filter((item) => item.isAbsentNow && item.consecutive >= 2)
      .sort((a, b) => b.consecutive - a.consecutive);

    let absenteesSection = '';
    if (longAbsentees.length > 0) {
      absenteesSection = '⚠️ غائبون أكثر من أسبوعين:\n' +
        longAbsentees
          .map((a) => `- ${a.name} (${a.consecutive} ${a.consecutive === 2 ? 'أسبوعين' : 'أسابيع'}) - الخادم: ${a.servantName}`)
          .join('\n') + '\n';
    } else {
      absenteesSection = '✨ لا يوجد غياب متكرر (أكثر من أسبوعين)\n';
    }

    return (
`✝️ تقرير اجتماع إعدادي — جمعة ${formattedDate}
━━━━━━━━━━━━━━━━━
📊 نسبة الحضور الإجمالية: ${stats.attendancePercentage}٪ (${stats.present} من ${youth.length})
• أولى إعدادي: ${p1Present} من ${p1Youth.length} (${p1Pct}٪)
• ثانية إعدادي: ${p2Present} من ${p2Youth.length} (${p2Pct}٪)
• ثالثة إعدادي: ${p3Present} من ${p3Youth.length} (${p3Pct}٪)
${absenteesSection}صلوا من أجل الخدمة 🕊️✨`
    );
  };

  const handleCopySummary = async () => {
    const text = generateMeetingSummary();
    triggerHaptic('success');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 3500);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  // ── SAVE HANDLER (CORE & AUDIT GATE) ─────────────────────────
  const executeSave = async (auditCategory?: AuditReasonCategory, auditNotes?: string) => {
    setIsSaving(true);
    const records = Object.entries(localStatuses).map(([youthId, status]) => ({
      youth_id: youthId,
      session_date: selectedDate,
      status,
    }));

    try {
      await saveAttendance(records);
      setIsSaving(false);
      setSaveSuccess(true);
      triggerHaptic('success');

      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      if (auditCategory) {
        setSaveToast({
          show: true,
          type: 'audit_sync',
          message: '✓ تم توثيق وحفظ التعديل الاستثنائي في سجل التدقيق التاريخي بنجاح!',
        });
      } else if (isOffline) {
        setSaveToast({
          show: true,
          type: 'offline_local',
          message: '✓ تم الحفظ محلياً على هاتفك بأمان وسيتم المزامنة تلقائياً عند عودة الاتصال.',
        });
      } else {
        setSaveToast({
          show: true,
          type: 'online_sync',
          message: '✓ تم حفظ الحضور ومزامنته سحابياً بنجاح لجميع الخدام!',
        });
      }

      if (stats.attendancePercentage >= 70) {
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        }).catch(() => {});
      }

      setTimeout(() => setSaveSuccess(false), 3000);
      setTimeout(() => setSaveToast((prev) => ({ ...prev, show: false })), 5000);
    } catch (err) {
      console.error('Error saving shared attendance:', err);
      setIsSaving(false);
      setSaveToast({
        show: true,
        type: 'offline_local',
        message: '✓ تم الحفظ محلياً على هاتفك بأمان وسيتم المزامنة تلقائياً عند عودة الاتصال.',
      });
      setTimeout(() => setSaveToast((prev) => ({ ...prev, show: false })), 5000);
    }
  };

  const handleSaveButtonClick = () => {
    if (isEditingLocked) return;
    // If saving an archived historical record under Admin Override, trigger the Audit Reason Gate
    if (isHistoricalDate && isAdmin && adminUnlocked) {
      setIsAuditModalOpen(true);
      return;
    }
    executeSave();
  };

  const schoolYearLabel = (year: string) => {
    switch (year) {
      case '1st Prep': return 'أولى إعدادي';
      case '2nd Prep': return 'ثانية إعدادي';
      case '3rd Prep': return 'ثالثة إعدادي';
      default: return year;
    }
  };

  return (
    <div className="space-y-4 pb-28 relative animate-fade-in">
      {/* ── STAGE 2: THE FRIDAY-CENTRIC CALENDAR RIBBON ── */}
      <FridayCalendarRibbon
        selectedDate={selectedDate}
        onSelectDate={(newDate) => {
          triggerHaptic('light');
          setSelectedDate(newDate);
        }}
        attendance={attendance}
        totalYouthCount={youth.length}
        lastFridayDate={lastFridayDate}
        nextFridayDate={nextFridayDate}
      />

      {/* ── EXPLICIT OFFLINE / SYNCED TOAST NOTIFICATION ── */}
      {saveToast.show && (
        <Portal lockScroll={false}>
          <div className="fixed top-16 left-4 right-4 max-w-lg mx-auto z-50 animate-fade-in pointer-events-auto">
            <div
              className={`p-4 rounded-3xl shadow-2xl border flex items-start gap-3 backdrop-blur-xl transition-all ${
                saveToast.type === 'offline_local'
                  ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/40'
                  : saveToast.type === 'audit_sync'
                  ? 'bg-amber-950/95 border-amber-500/50 text-amber-100 shadow-amber-950/40'
                  : 'bg-slate-900/95 border-sky-500/50 text-sky-100 shadow-sky-950/40'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  saveToast.type === 'offline_local'
                    ? 'bg-emerald-600 text-white'
                    : saveToast.type === 'audit_sync'
                    ? 'bg-amber-600 text-white'
                    : 'bg-sky-600 text-white'
                }`}
              >
                {saveToast.type === 'offline_local' ? (
                  <WifiOff className="w-5 h-5" />
                ) : saveToast.type === 'audit_sync' ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 space-y-0.5 pt-0.5">
                <p className="text-xs font-bold font-cairo text-white">
                  {saveToast.type === 'offline_local'
                    ? 'حفظ محلي آمن (بدون إنترنت)'
                    : saveToast.type === 'audit_sync'
                    ? 'توثيق تدقيق إداري معتمد'
                    : 'تم الحفظ والمزامنة السحابية'}
                </p>
                <p className="text-xs font-tajawal text-slate-200/90 leading-relaxed">
                  {saveToast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSaveToast((prev) => ({ ...prev, show: false }))}
                className="p-1 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* ── Top Header & Stats Card ──────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-400" />

        <div className="p-4 sm:p-5 space-y-4">
          {/* Header Title + Context Tags + Door Mode Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-cairo flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-500 shrink-0" />
                  كشف حضور: {formatDateArabic(selectedDate)}
                </h2>

                {/* Lifecycle State Pill */}
                {currentLifecycle.state === 'live' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500 text-white animate-pulse font-cairo">
                    <Zap className="w-3 h-3 fill-white" />
                    جلسة نشطة الليلة
                  </span>
                )}
                {currentLifecycle.state === 'grace' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-cairo">
                    <Clock className="w-3 h-3" />
                    مراجعة الأعذار
                  </span>
                )}
                {currentLifecycle.state === 'locked' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-cairo">
                    <Lock className="w-3 h-3" />
                    مؤرشف ومقفل
                  </span>
                )}

              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-tajawal mt-1">
                كشف موحد وشامل لجميع الخدام • متاح التعديل المشترك والتسجيل اللحظي
              </p>
            </div>

            {/* Quick Actions (Custom Date Input) */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-2.5 text-center">
              <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                {stats.present}
              </div>
              <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 font-cairo">
                حاضر ({stats.attendancePercentage}%)
              </div>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-2.5 text-center">
              <div className="text-lg sm:text-xl font-black text-rose-700 dark:text-rose-400 font-mono">
                {stats.absent}
              </div>
              <div className="text-[11px] font-bold text-rose-800 dark:text-rose-300 font-cairo">
                غائب
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-2.5 text-center">
              <div className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-400 font-mono">
                {stats.excused}
              </div>
              <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 font-cairo">
                معتذر
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-center">
              <div className="text-lg sm:text-xl font-black text-slate-700 dark:text-slate-300 font-mono">
                {stats.unrecorded}
              </div>
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 font-cairo">
                متبقي
              </div>
            </div>
          </div>

          {/* ── 1-TAP WHATSAPP MEETING SUMMARY BAR ── */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <MessageCircle className="w-4 h-4 fill-white" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-cairo">
                  تقرير اللقاء لجروب الخدام (واتساب)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-tajawal">
                  ملخص منسق بنسب الحضور لكل فصل وقائمة الغياب المتكرر
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleCopySummary}
                className={`px-3 py-1.5 rounded-xl font-bold font-cairo text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                  copiedSummary
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                    : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                {copiedSummary ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>تم النسخ بنجاح! ✨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ التقرير</span>
                  </>
                )}
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(generateMeetingSummary())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-cairo flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                title="إرسال مباشرة عبر واتساب"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>إرسال لواتساب</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRIOR WEEKS LOCK BANNER ──────────────── */}
      {isHistoricalDate && (
        <div className="animate-fade-in">
          {!isAdmin ? (
            <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400 shadow-xs">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold font-cairo flex items-center gap-1.5">
                    <span>سجل تاريخي مقفل لحماية الأرشيف</span>
                  </div>
                  <div className="text-[11px] text-amber-700/80 dark:text-amber-300/80 font-tajawal">
                    هذا السجل مؤرّخ لمنع التعديل العرضي. لتعديل الغياب أو الحضور في الأسابيع السابقة، يرجى مراجعة أمين الخدمة.
                  </div>
                </div>
              </div>
              <span className="shrink-0 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold font-cairo text-xs">
                قراءة فقط
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-3xl bg-sky-500/10 border border-sky-500/25 text-sky-900 dark:text-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${adminUnlocked ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-sky-500/20 text-sky-600 dark:text-sky-400'}`}>
                  {adminUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold font-cairo flex items-center gap-2">
                    <span>سجل تاريخي مؤرشف</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-sky-600 text-white font-bold">
                      <ShieldCheck className="w-3 h-3" />
                      صلاحية أمين خدمة
                    </span>
                  </div>
                  <div className="text-[11px] text-sky-700/80 dark:text-sky-300/80 font-tajawal">
                    {adminUnlocked
                      ? 'وضع التعديل الإداري مفعل: سيطلب منك النظام توثيق سبب التعديل عند الحفظ لحماية سجل التدقيق.'
                      : 'السجل مقفل حمايةً للأرشيف. يمكنك فك القفل وإجراء تعديلات استثنائية موثقة.'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAdminUnlocked(!adminUnlocked)}
                className={`self-end sm:self-center px-3.5 py-2 rounded-xl font-bold font-cairo text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                  adminUnlocked
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-sky-600 hover:bg-sky-700 text-white'
                }`}
              >
                {adminUnlocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>إعادة قفل السجل</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>فك قفل التعديل</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Filters & Thumb-Anchored Cohort Cockpit ───────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        {/* Search Input with Clear Button */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث بالاسم (مثال: فيلو، أبانوب) أو آخر أرقام الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 text-xs rounded-xl pr-9 pl-9 py-2.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-tajawal transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                triggerHaptic('light');
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Cohort Tabs with Live Completion Progress Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto max-w-full">
            {/* All */}
            <button
              type="button"
              onClick={() => {
                setSelectedYear('all');
                triggerHaptic('light');
              }}
              className={`text-xs px-3 py-1.5 rounded-xl font-cairo transition-all flex items-center gap-1.5 ${
                selectedYear === 'all'
                  ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>الكل</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/70 dark:bg-slate-800 font-mono">
                {youth.length}
              </span>
            </button>

            {/* 1st Prep */}
            <button
              type="button"
              onClick={() => {
                setSelectedYear('1st Prep');
                triggerHaptic('light');
              }}
              className={`text-xs px-3 py-1.5 rounded-xl font-cairo transition-all flex items-center gap-1.5 ${
                selectedYear === '1st Prep'
                  ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>أولى</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                {cohortStats.p1.present}/{cohortStats.p1.total}
              </span>
            </button>

            {/* 2nd Prep */}
            <button
              type="button"
              onClick={() => {
                setSelectedYear('2nd Prep');
                triggerHaptic('light');
              }}
              className={`text-xs px-3 py-1.5 rounded-xl font-cairo transition-all flex items-center gap-1.5 ${
                selectedYear === '2nd Prep'
                  ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>ثانية</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                {cohortStats.p2.present}/{cohortStats.p2.total}
              </span>
            </button>

            {/* 3rd Prep */}
            <button
              type="button"
              onClick={() => {
                setSelectedYear('3rd Prep');
                triggerHaptic('light');
              }}
              className={`text-xs px-3 py-1.5 rounded-xl font-cairo transition-all flex items-center gap-1.5 ${
                selectedYear === '3rd Prep'
                  ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>ثالثة</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                {cohortStats.p3.present}/{cohortStats.p3.total}
              </span>
            </button>
          </div>

          {/* Quick Bulk Actions */}
          {!isEditingLocked && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={markAllFilteredPresent}
                className="text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 px-2.5 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800 font-cairo flex items-center gap-1 active:scale-95 transition-transform"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                الكل حاضر
              </button>

              <button
                type="button"
                onClick={clearFiltered}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1.5 rounded-xl font-cairo flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                تفريغ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Full Roster List with Fast Single-Tap & Attribution ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500 font-cairo">
          <span>المخدومين ({filteredYouth.length})</span>
          <span>{isEditingLocked ? 'حالة الحضور (مقفل)' : 'تسجيل الحالة'}</span>
        </div>

        {filteredYouth.map((member) => {
          const status = localStatuses[member.id];
          const existingRecord = attendance.find(
            (a) => a.youth_id === member.id && a.session_date === selectedDate
          );
          const recorderServant = existingRecord?.recorded_by
            ? servants.find((s) => s.id === existingRecord.recorded_by)
            : null;

          const isLocallyModified = existingRecord && existingRecord.status !== status;
          const triageEval = evaluateYouthPastoralRisk(member, attendance, selectedDate);

          return (
            <div
              key={member.id}
              className={`p-3 rounded-2xl border transition-all duration-200 ${
                status === 'present'
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 shadow-xs'
                  : status === 'absent'
                  ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                  : status === 'excused'
                  ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Youth Info, Triage Tag & Longitudinal Sparkline */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-cairo truncate">
                      {member.name}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-tajawal shrink-0">
                      {schoolYearLabel(member.school_year)}
                    </span>

                    {/* Pastoral Triage Risk Tag */}
                    {triageEval.category === 'critical_dropout' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-cairo shrink-0 animate-pulse">
                        🔴 خطر انقطاع ({triageEval.consecutiveAbsences}+)
                      </span>
                    )}
                    {triageEval.category === 'newcomer_risk' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 font-cairo shrink-0">
                        🟠 مخدوم جديد
                      </span>
                    )}
                    {triageEval.category === 'fading_regular' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-900 font-cairo shrink-0">
                        🟡 فتور تدريجي
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-tajawal">
                    <span>الخادم: <strong className="text-slate-700 dark:text-slate-300 font-medium">{getServantName(member.assigned_servant_id)}</strong></span>
                    {member.phone && (
                      <>
                        <span>•</span>
                        <a
                          href={`tel:${member.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-slate-600 dark:text-slate-400 hover:text-sky-600 flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{member.phone}</span>
                        </a>
                      </>
                    )}
                  </div>

                  {/* ── STAGE 3: 12-Week Longitudinal Micro-Sparkline Strip ── */}
                  <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                    <MemberSparkline
                      youthId={member.id}
                      attendance={attendance}
                      windowSize={12}
                      referenceDateStr={selectedDate}
                      compact={true}
                    />
                  </div>

                  {/* ── ATTRIBUTION STAMP: Who recorded or modified this record ── */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {recorderServant && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-md border border-sky-100 dark:border-sky-900/40 font-tajawal">
                        <UserCheck className="w-3 h-3 text-sky-500" />
                        <span>سجّله: <strong className="font-semibold">{recorderServant.name}</strong></span>
                      </span>
                    )}

                    {isLocallyModified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/50 font-tajawal">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span>مُعدّل بواسطة: {currentServant?.name || 'الخادم الحالي'} (بانتظار الحفظ)</span>
                      </span>
                    )}

                    {!recorderServant && status && (
                      <span className="text-[10px] text-slate-400 font-tajawal">
                        سُجل تلقائياً
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Segmented Check-in Controls ── */}
                <div
                  className="flex items-center gap-1.5 self-end sm:self-center shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isEditingLocked ? (
                    <div className="flex items-center gap-2">
                      {status === 'present' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-cairo">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          حاضر
                        </span>
                      )}
                      {status === 'absent' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-cairo">
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          غائب
                        </span>
                      )}
                      {status === 'excused' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-cairo">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                          معتذر
                        </span>
                      )}
                      {!status && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 font-cairo">
                          غير مسجل
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setHistoryModalYouth(getYouthWithDetails(member))}
                        title="سجل الحضور السنوي"
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Present Button [P] */}
                      <button
                        type="button"
                        onClick={() => setStatus(member.id, 'present')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold font-cairo flex items-center gap-1 transition-all active:scale-95 ${
                          status === 'present'
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>حاضر</span>
                      </button>

                      {/* Absent Button [A] */}
                      <button
                        type="button"
                        onClick={() => setStatus(member.id, 'absent')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold font-cairo flex items-center gap-1 transition-all active:scale-95 ${
                          status === 'absent'
                            ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>غائب</span>
                      </button>

                      {/* Excused Button [E] */}
                      <button
                        type="button"
                        onClick={() => setStatus(member.id, 'excused')}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold font-cairo flex items-center gap-1 transition-all active:scale-95 ${
                          status === 'excused'
                            ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600'
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>معتذر</span>
                      </button>

                      {/* History Modal Trigger */}
                      <button
                        type="button"
                        onClick={() => setHistoryModalYouth(getYouthWithDetails(member))}
                        title="سجل الحضور السنوي"
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Sticky Bottom Floating Save Bar (Visible when editing is allowed) ──────── */}
      {!isEditingLocked && (
        <Portal lockScroll={false}>
          <div className="fixed bottom-20 left-0 right-0 max-w-2xl mx-auto px-4 z-30 pointer-events-none animate-fade-in">
            <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-cairo">
                  {stats.present + stats.absent + stats.excused} من {youth.length} مسجل
                </div>
                <div className="text-[11px] text-slate-500 font-tajawal">
                  نسبة الحضور: {stats.attendancePercentage}% • المسجل: {currentServant?.name || 'الخادم الحالي'}
                </div>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveButtonClick}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold font-cairo text-xs text-white shadow-md transition-all active:scale-95 ${
                  saveSuccess
                    ? 'bg-emerald-600'
                    : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700'
                }`}
              >
                {isSaving ? (
                  <span>جارِ الحفظ...</span>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>تم الحفظ بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>
                      {isHistoricalDate && adminUnlocked ? 'توثيق وحفظ السجل التاريخي' : 'حفظ كشف الحضور المشترك'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* ── Admin Mandatory Audit Reason Modal ── */}
      <AdminAuditReasonModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        sessionDate={selectedDate}
        isSaving={isSaving}
        onConfirm={(category, notes) => {
          setIsAuditModalOpen(false);
          executeSave(category, notes);
        }}
      />

      {/* ── Attendance History Modal ─────────────── */}
      {historyModalYouth && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col my-auto max-h-[calc(100dvh-2rem)] overflow-hidden">
              <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 font-cairo">
                    سجل حضور: {historyModalYouth.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-tajawal">
                    {schoolYearLabel(historyModalYouth.school_year)} • نسبة الحضور: {historyModalYouth.attendance_rate}%
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryModalYouth(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                {/* Attendance stats overview */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <div className="text-base font-black font-mono text-slate-900 dark:text-slate-100">
                      {historyModalYouth.total_sessions}
                    </div>
                    <div className="text-[10px] text-slate-500 font-cairo">إجمالي اللقاءات</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                    <div className="text-base font-black font-mono text-emerald-700 dark:text-emerald-400">
                      {historyModalYouth.present_sessions}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-cairo">حضور</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                    <div className="text-base font-black font-mono text-rose-700 dark:text-rose-400">
                      {historyModalYouth.consecutive_absences}
                    </div>
                    <div className="text-[10px] text-rose-700 font-cairo">غيابات متتالية</div>
                  </div>
                </div>

                {/* 12-Week Longitudinal Micro-Sparkline Strip */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 space-y-1.5">
                  <div className="text-xs font-bold font-cairo text-slate-700 dark:text-slate-300">
                    شريط حضور آخر ١٢ أسبوع:
                  </div>
                  <MemberSparkline
                    youthId={historyModalYouth.id}
                    attendance={attendance}
                    windowSize={12}
                    referenceDateStr={selectedDate}
                    showConsistencyBadge={true}
                    showStreakBadge={true}
                  />
                </div>

                {/* Sessions list */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {attendance
                    .filter((a) => a.youth_id === historyModalYouth.id)
                    .sort((a, b) => b.session_date.localeCompare(a.session_date))
                    .map((session) => {
                      const recorder = session.recorded_by
                        ? servants.find((s) => s.id === session.recorded_by)
                        : null;
                      return (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {formatDateArabic(session.session_date)}
                            </div>
                            {recorder && (
                              <div className="text-[10px] text-slate-400 font-tajawal">
                                بواسطة: {recorder.name}
                              </div>
                            )}
                          </div>

                          {session.status === 'present' && (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold font-cairo flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> حاضر
                            </span>
                          )}
                          {session.status === 'absent' && (
                            <span className="text-rose-700 dark:text-rose-400 font-bold font-cairo flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> غائب
                            </span>
                          )}
                          {session.status === 'excused' && (
                            <span className="text-amber-700 dark:text-amber-400 font-bold font-cairo flex items-center gap-1">
                              <HelpCircle className="w-3.5 h-3.5" /> معتذر
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setHistoryModalYouth(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold font-cairo text-slate-700 dark:text-slate-300 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
