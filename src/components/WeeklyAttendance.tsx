'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatDateArabic, formatShortDateArabic } from '@/lib/utils';
import { AttendanceStatus, SchoolYear, YouthWithDetails } from '@/types/database';
import {
  Calendar,
  CheckCircle,
  XCircle,
  HelpCircle,
  Save,
  Search,
  History,
  CheckCheck,
} from 'lucide-react';

export function WeeklyAttendance() {
  const {
    youth,
    attendance,
    saveAttendance,
    getYouthWithDetails,
    lastFridayDate,
    nextFridayDate,
  } = useApp();

  const [selectedDate, setSelectedDate] = useState<string>(lastFridayDate);
  const [selectedYear, setSelectedYear] = useState<SchoolYear | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [historyModalYouth, setHistoryModalYouth] = useState<YouthWithDetails | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, AttendanceStatus>>({});

  // Sync localStatuses when selectedDate or attendance changes
  React.useEffect(() => {
    const map: Record<string, AttendanceStatus> = {};
    youth.forEach((y) => {
      const existing = attendance.find(
        (a) => a.youth_id === y.id && a.session_date === selectedDate
      );
      if (existing) map[y.id] = existing.status;
    });
    setLocalStatuses(map);
    setSaveSuccess(false);
  }, [selectedDate, attendance, youth]);

  const filteredYouth = useMemo(() => {
    return youth.filter((y) => {
      const matchesYear = selectedYear === 'all' || y.school_year === selectedYear;
      const matchesSearch =
        !searchQuery ||
        y.name.includes(searchQuery) ||
        y.phone.includes(searchQuery);
      return matchesYear && matchesSearch;
    });
  }, [youth, selectedYear, searchQuery]);

  const setStatus = (youthId: string, status: AttendanceStatus) => {
    setLocalStatuses((prev) => ({ ...prev, [youthId]: status }));
    setSaveSuccess(false);
  };

  const markAllFilteredPresent = () => {
    const nextStatuses = { ...localStatuses };
    filteredYouth.forEach((y) => { nextStatuses[y.id] = 'present'; });
    setLocalStatuses(nextStatuses);
    setSaveSuccess(false);
  };

  const clearFiltered = () => {
    const nextStatuses = { ...localStatuses };
    filteredYouth.forEach((y) => { delete nextStatuses[y.id]; });
    setLocalStatuses(nextStatuses);
  };

  const stats = useMemo(() => {
    let present = 0, absent = 0, excused = 0, unrecorded = 0;
    youth.forEach((y) => {
      const st = localStatuses[y.id];
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'excused') excused++;
      else unrecorded++;
    });
    const recordedTotal = present + absent + excused;
    const attendancePercentage = recordedTotal > 0 ? Math.round((present / recordedTotal) * 100) : 0;
    return { present, absent, excused, unrecorded, total: youth.length, attendancePercentage };
  }, [youth, localStatuses]);

  const handleSave = async () => {
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
      if (stats.attendancePercentage >= 70) {
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.75 } });
        }).catch(() => {});
      }
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  // Quick date chips derived from context
  const quickFridayDates = useMemo(() => {
    const last = new Date(lastFridayDate);
    const prevFriday = new Date(last);
    prevFriday.setDate(last.getDate() - 7);
    return [
      { label: 'الجمعة الماضية', date: lastFridayDate },
      { label: 'الجمعة السابقة', date: prevFriday.toISOString().split('T')[0] },
      { label: 'القادمة', date: nextFridayDate },
    ];
  }, [lastFridayDate, nextFridayDate]);

  const yearLabel = (year: SchoolYear | 'all') =>
    year === 'all' ? 'الكل' : year === '1st Prep' ? 'أولى' : year === '2nd Prep' ? 'ثانية' : 'ثالثة';

  const schoolYearLabel = (year: string) =>
    year === '1st Prep' ? 'أولى إعدادي' : year === '2nd Prep' ? 'ثانية إعدادي' : 'ثالثة إعدادي';

  const recordedCount = Object.keys(localStatuses).length;
  const recordedPct = youth.length > 0 ? Math.round((recordedCount / youth.length) * 100) : 0;

  return (
    <div className="space-y-4 pb-28 animate-fade-in">

      {/* ── Date & Stats Card ──────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card overflow-hidden">

        {/* Colored top stripe */}
        <div className="h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-400" />

        <div className="p-4 space-y-4">
          {/* Title + date input */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-cairo flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
                تسجيل الحضور الأسبوعي
              </h2>
              <p className="text-[11px] text-slate-400 font-tajawal mt-0.5">
                اختر تاريخ الجمعة ورصد الحضور لجميع الفصول
              </p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 shrink-0"
            />
          </div>

          {/* Quick date chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-tajawal">اختيار سريع:</span>
            {quickFridayDates.map((item) => (
              <button
                key={item.date}
                onClick={() => setSelectedDate(item.date)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                  selectedDate === item.date
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {item.label} · {formatShortDateArabic(item.date)}
              </button>
            ))}
          </div>

          {/* Live stats grid */}
          <div className="grid grid-cols-4 gap-2">
            {/* Present */}
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 p-2.5 text-center">
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide block">حاضر</span>
              <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 font-cairo">{stats.present}</span>
            </div>
            {/* Absent */}
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40 p-2.5 text-center">
              <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide block">غائب</span>
              <span className="text-xl font-extrabold text-rose-700 dark:text-rose-300 font-cairo">{stats.absent}</span>
            </div>
            {/* Excused */}
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 p-2.5 text-center">
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide block">معتذر</span>
              <span className="text-xl font-extrabold text-amber-700 dark:text-amber-300 font-cairo">{stats.excused}</span>
            </div>
            {/* Percentage */}
            <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/40 p-2.5 text-center">
              <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide block">نسبة</span>
              <span className="text-xl font-extrabold text-sky-700 dark:text-sky-300 font-cairo">{stats.attendancePercentage}%</span>
            </div>
          </div>

          {/* Recording progress bar */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1.5 font-tajawal">
              <span>تم رصد {recordedCount} من أصل {youth.length}</span>
              <span>{recordedPct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${recordedPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters Row ───────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Year tabs */}
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-x-auto">
          {(['all', '1st Prep', '2nd Prep', '3rd Prep'] as const).map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedYear === year
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              {yearLabel(year)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
          />
        </div>
      </div>

      {/* ── Bulk Actions Row ──────────────────────── */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs text-slate-400 font-tajawal">
          {filteredYouth.length} مخدوم
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllFilteredPresent}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>الكل حاضر</span>
          </button>
          <button
            onClick={clearFiltered}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 text-xs font-medium transition-colors"
          >
            مسح
          </button>
        </div>
      </div>

      {/* ── Youth List ────────────────────────────── */}
      <div className="space-y-2">
        {filteredYouth.map((member) => {
          const status = localStatuses[member.id];
          const detailed = getYouthWithDetails(member);

          const borderColor =
            status === 'present' ? 'border-emerald-200 dark:border-emerald-800/50'
            : status === 'absent' ? 'border-rose-200 dark:border-rose-800/50'
            : status === 'excused' ? 'border-amber-200 dark:border-amber-800/50'
            : 'border-slate-200 dark:border-slate-800';

          const bgColor =
            status === 'present' ? 'bg-emerald-50/60 dark:bg-emerald-950/20'
            : status === 'absent' ? 'bg-rose-50/60 dark:bg-rose-950/20'
            : status === 'excused' ? 'bg-amber-50/60 dark:bg-amber-950/20'
            : 'bg-white dark:bg-slate-900';

          const stripeColor =
            status === 'present' ? 'bg-emerald-400'
            : status === 'absent' ? 'bg-rose-400'
            : status === 'excused' ? 'bg-amber-400'
            : 'bg-slate-200 dark:bg-slate-700';

          return (
            <div
              key={member.id}
              className={`roster-card relative rounded-2xl border transition-all duration-200 overflow-hidden ${bgColor} ${borderColor}`}
            >
              {/* Left status stripe */}
              <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${stripeColor}`} />

              <div className="p-3 pl-4 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Info + history */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    status === 'present' ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700'
                    : status === 'absent' ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600'
                    : status === 'excused' ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    {member.name.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-cairo truncate">
                        {member.name}
                      </span>
                      {detailed.attendance_rate !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                          {detailed.attendance_rate}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-tajawal">
                      <span>{schoolYearLabel(member.school_year)}</span>
                      <span>·</span>
                      <span className="font-mono" dir="ltr">{member.phone}</span>
                    </div>
                  </div>

                  {/* History trigger */}
                  <button
                    onClick={() => setHistoryModalYouth(detailed)}
                    className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                    title="سجل الحضور"
                  >
                    <History className="w-4 h-4" />
                  </button>
                </div>

                {/* Status toggle */}
                <div className="flex items-center justify-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <button
                    onClick={() => setStatus(member.id, 'present')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      status === 'present'
                        ? 'bg-emerald-600 text-white shadow-sm scale-102'
                        : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>حاضر</span>
                  </button>
                  <button
                    onClick={() => setStatus(member.id, 'absent')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      status === 'absent'
                        ? 'bg-rose-600 text-white shadow-sm scale-102'
                        : 'text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>غائب</span>
                  </button>
                  <button
                    onClick={() => setStatus(member.id, 'excused')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      status === 'excused'
                        ? 'bg-amber-500 text-white shadow-sm scale-102'
                        : 'text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>معتذر</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Sticky Save Bar ───────────────────────── */}
      <div className="sticky bottom-20 z-30">
        <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-lg text-white rounded-2xl shadow-card-lg border border-slate-700/80 flex items-center justify-between gap-3 px-4 py-3 max-w-lg mx-auto">
          <div>
            <span className="text-xs font-bold block font-cairo">
              {recordedCount} / {youth.length} تم رصدهم
            </span>
            <span className="text-[10px] text-slate-400 font-tajawal">
              {formatDateArabic(selectedDate)}
            </span>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all active:scale-95 ${
              saveSuccess
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-glow'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>
              {isSaving ? 'جارِ الحفظ...' : saveSuccess ? 'تم الحفظ ✓' : 'حفظ الحضور'}
            </span>
          </button>
        </div>
      </div>

      {/* ── History Modal ─────────────────────────── */}
      {historyModalYouth && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-card-lg overflow-hidden animate-slide-up">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-cairo">
                  {historyModalYouth.name}
                </h3>
                <p className="text-xs text-slate-400 font-tajawal mt-0.5">
                  نسبة الحضور الكلية: <span className="font-bold text-sky-600 dark:text-sky-400">{historyModalYouth.attendance_rate}%</span>
                </p>
              </div>
              <button
                onClick={() => setHistoryModalYouth(null)}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Session list */}
            <div className="max-h-72 overflow-y-auto p-3 space-y-1.5">
              {attendance
                .filter((a) => a.youth_id === historyModalYouth.id)
                .sort((a, b) => b.session_date.localeCompare(a.session_date))
                .map((session) => (
                  <div
                    key={session.id}
                    className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {formatDateArabic(session.session_date)}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                      session.status === 'present'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : session.status === 'absent'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {session.status === 'present' ? 'حاضر' : session.status === 'absent' ? 'غائب' : 'معتذر'}
                    </span>
                  </div>
                ))}
              {attendance.filter((a) => a.youth_id === historyModalYouth.id).length === 0 && (
                <p className="text-center text-xs text-slate-400 py-6 font-tajawal">
                  لا يوجد سجل حضور بعد
                </p>
              )}
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setHistoryModalYouth(null)}
                className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
