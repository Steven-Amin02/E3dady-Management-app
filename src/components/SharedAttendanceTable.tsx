'use client';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { attendanceKey, consecutiveAbsences, eligibleYouth, indexAttendance, schoolYearAt } from '@/lib/attendanceModel';
import { addDays, dayOfWeek, upcomingFriday, validDate } from '@/lib/serviceDate';
import { normalizeArabic } from '@/lib/arabicUtils';
import { formatDateArabic, schoolYearLabel } from '@/lib/utils';
import { errorMessage } from '@/lib/outbox';
import { evaluateYouthPastoralRisk } from '@/lib/pastoralAnalytics';
import { getSessionLifecycleState, type AuditReasonCategory } from '@/lib/fridayCalendar';
import type { Attendance, AttendanceStatus, SchoolYear, Youth } from '@/types/database';
import { FridayCalendarRibbon } from '@/components/FridayCalendarRibbon';
import { AdminAuditReasonModal } from '@/components/AdminAuditReasonModal';
import { MemberSparkline } from '@/components/MemberSparkline';
import { Portal } from '@/components/Portal';

const statusOptions: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'حاضر' }, { value: 'absent', label: 'غائب' }, { value: 'excused', label: 'معتذر' },
];
const AttendanceRow = memo(function AttendanceRow({ member, status, records, date, locked, conflict, onStatus, onHistory }: {
  member: Youth; status?: AttendanceStatus; records: Attendance[]; date: string; locked: boolean; conflict: boolean;
  onStatus: (id: string, status: AttendanceStatus | null) => void; onHistory: (member: Youth) => void;
}) {
  const risk = useMemo(() => evaluateYouthPastoralRisk(member, records, date), [member, records, date]);
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 space-y-3">
    <div className="flex justify-between items-start gap-3">
      <div><h3 className="font-bold">{member.name}</h3><p className="text-xs text-slate-500">{schoolYearAt(member, date) ? schoolYearLabel(schoolYearAt(member, date)) : 'الفصل التاريخي غير موثق'} · {risk.meta.badgeText}</p></div>
      <div className="flex gap-3 text-xs underline"><a href={`tel:${member.phone.replace(/[^0-9+]/g, '')}`}>اتصال</a><button onClick={() => onHistory(member)}>السجل</button></div>
    </div>
    {conflict && <p role="alert" className="text-xs text-red-600">تغير السجل على الخادم أثناء تعديل مسودتك. ألغِ المسودة وحمّل الأحدث.</p>}
    <MemberSparkline youthId={member.id} attendance={records} referenceDateStr={date} compact />
    <div className="grid grid-cols-4 gap-2">
      {statusOptions.map(option => <button key={option.value} disabled={locked} aria-pressed={status === option.value}
        className={`rounded-xl py-2 text-xs border disabled:opacity-50 ${status === option.value ? 'bg-sky-700 border-sky-700 text-white' : 'border-slate-300 dark:border-slate-600'}`}
        onClick={() => onStatus(member.id, option.value)}>{option.label}</button>)}
      <button disabled={locked || !status} onClick={() => onStatus(member.id, null)} className="rounded-xl border border-slate-300 text-xs disabled:opacity-40">إعادة لغير مسجل</button>
    </div>
  </article>;
});

export function SharedAttendanceTable({ initialDate }: { initialDate?: string }) {
  const { allYouth, servants, attendance, saveAttendance, editAttendance, discardDraft, ensureSession, today, lastFridayDate, nextFridayDate, pendingOperations, attendanceRange, loadedSessionDates, attendanceDrafts } = useApp(s => ({
    allYouth: s.youth, servants: s.servants, attendance: s.attendance, saveAttendance: s.saveAttendance,
    editAttendance: s.editAttendance, discardDraft: s.discardDraft, ensureSession: s.ensureSession, today: s.today,
    lastFridayDate: s.lastFridayDate, nextFridayDate: s.nextFridayDate, pendingOperations: s.pendingOperations,
    attendanceRange: s.attendanceRange, loadedSessionDates: s.loadedSessionDates,
    attendanceDrafts: s.attendanceDrafts,
  }));
  const [date, setDate] = useState(initialDate ?? upcomingFriday(today));
  const [search, setSearch] = useState(''), [year, setYear] = useState<SchoolYear | 'all'>('all');
  const [unrecordedOnly, setUnrecordedOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [history, setHistory] = useState<Youth | null>(null), [loadingDate, setLoadingDate] = useState<string | null>(null);
  const draft = useApp(s => s.attendanceDrafts[date]);
  const youth = useMemo(() => eligibleYouth(allYouth, date), [allYouth, date]);
  const lifecycle = useMemo(() => getSessionLifecycleState(date, new Date(today + 'T12:00:00Z')), [date, today]);
  const historical = lifecycle.state === 'locked';
  const pending = pendingOperations.some(op => op.kind === 'attendance' && op.changes.some(c => c.session_date === date));
  const available = (attendanceRange.from && date >= attendanceRange.from && date <= attendanceRange.to) || loadedSessionDates.includes(date);
  const locked = saving || loadingDate === date || !available || pending || lifecycle.state === 'upcoming';
  const isUpcoming = lifecycle.state === 'upcoming';
  const index = useMemo(() => indexAttendance(attendance), [attendance]);
  const statuses = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    for (const member of youth) {
      const status = index.byKey.get(attendanceKey(member.id, date))?.status;
      if (status) map[member.id] = status;
    }
    for (const [id, change] of Object.entries(draft ?? {})) {
      if (change.status === null) delete map[id]; else map[id] = change.status;
    }
    return map;
  }, [youth, index, date, draft]);
  useEffect(() => {
    let active = true;
    // The asynchronous result changes feedback, never the user's draft.
    void ensureSession(date).catch(e => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [date, ensureSession]);
  const chooseDate = async (value: string) => {
    if (!validDate(value) || dayOfWeek(value) !== 5) { setError('اختر تاريخ يوم جمعة صالح'); return; }
    setDate(value); setMessage(''); setError(''); setLoadingDate(value);
    try { await ensureSession(value); } catch (e) { setError(errorMessage(e)); }
    finally { setLoadingDate(null); }
  };
  const changeStatus = useCallback((id: string, status: AttendanceStatus | null) => {
    if (!locked) void editAttendance(date, { [id]: status }).catch(e => setError(errorMessage(e)));
  }, [locked, editAttendance, date]);
  const showHistory = useCallback((member: Youth) => setHistory(member), []);
  const filtered = useMemo(() => {
    const query = normalizeArabic(search), number = search.replace(/\D/g, '');
    return youth.filter(y => (year === 'all' || schoolYearAt(y, date) === year) &&
      (!unrecordedOnly || !statuses[y.id]) && (!search.trim() ||
      normalizeArabic(y.name).includes(query) || (number.length >= 2 && y.phone.replace(/\D/g, '').includes(number))))
      .sort((a, b) => a.school_year.localeCompare(b.school_year) || a.name.localeCompare(b.name, 'ar'));
  }, [youth, year, search, date, unrecordedOnly, statuses]);
  const stats = useMemo(() => {
    const count = (status: AttendanceStatus) => youth.filter(y => statuses[y.id] === status).length;
    const present = count('present'), absent = count('absent'), excused = count('excused');
    const recorded = present + absent + excused;
    return { present, absent, excused, recorded, unrecorded: youth.length - recorded,
      percentage: youth.length ? Math.round(present / youth.length * 100) : 0,
      recordedPercentage: recorded ? Math.round(present / recorded * 100) : 0 };
  }, [youth, statuses]);
  const draftDates = Object.keys(attendanceDrafts).filter(d => d !== date && Object.keys(attendanceDrafts[d] ?? {}).length > 0);
  const cohorts = useMemo(() => (['1st Prep', '2nd Prep', '3rd Prep'] as SchoolYear[]).map(schoolYear => {
    const members = youth.filter(y => schoolYearAt(y, date) === schoolYear);
    const present = members.filter(y => statuses[y.id] === 'present').length;
    return { schoolYear, total: members.length, present, percentage: members.length ? Math.round(present / members.length * 100) : 0 };
  }), [youth, statuses, date]);
  const repeatedAbsences = useMemo(() => youth.filter(y => statuses[y.id] === 'absent').map(y => ({
    name: y.name, count: Math.min(12, 1 + consecutiveAbsences(y.id, attendance, addDays(date, -7))),
    servant: servants.find(s => s.id === y.assigned_servant_id)?.name ?? 'غير محدد',
  })).filter(y => y.count >= 2).sort((a, b) => b.count - a.count), [youth, statuses, attendance, date, servants]);
  const summary = `تقرير حضور ${formatDateArabic(date)}\nالحاضرون: ${stats.present} من ${youth.length} (${stats.percentage}٪)\nالغائبون: ${stats.absent}\nالمعتذرون: ${stats.excused}\nغير مسجل: ${stats.unrecorded}\n${cohorts.map(c => `${schoolYearLabel(c.schoolYear)}: ${c.present} من ${c.total} (${c.percentage}٪)`).join('\n')}${repeatedAbsences.length ? '\nغياب متكرر:\n' + repeatedAbsences.map(y => `${y.name}: ${y.count} أسابيع، الخادم: ${y.servant}`).join('\n') : ''}${Object.keys(draft ?? {}).length ? '\nيتضمن تعديلات المسودة غير المرسلة.' : ''}`;
  async function save(category?: AuditReasonCategory, notes = '') {
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await saveAttendance(date, category, notes);
      setMessage(result.cloudSynced ? 'تم تأكيد حفظ التغييرات على الخادم.' : 'حُفظت محاولة التغيير على الجهاز وتنتظر تأكيد المزامنة.');
      setAuditOpen(false);
    } catch (e) { setError(errorMessage(e)); }
    finally { setSaving(false); }
  }
  const stageAll = (status: AttendanceStatus | null) => {
    if (locked) return;
    const action = status === 'present' ? `تسجيل ${filtered.length} شابًا من المعروضين كحاضر` : 'إعادة حالات المعروضين إلى غير مسجل';
    if (window.confirm(`${action} في جلسة ${formatDateArabic(date)}؟`)) {
      void editAttendance(date, Object.fromEntries(filtered.map(y => [y.id, status]))).catch(e => setError(errorMessage(e)));
    }
  };
  return <div className="space-y-4 pb-28">
    <section className="rounded-2xl border border-sky-200 bg-white p-4 dark:border-sky-800 dark:bg-slate-900">
      <p className="text-xs font-bold text-sky-700 dark:text-sky-300">جلسة الحضور</p>
      <h2 className="mt-1 text-lg font-black">حضور {formatDateArabic(date)}</h2>
      <p className="mt-1 text-xs text-slate-500">{isUpcoming ? 'هذه الجلسة لم تبدأ بعد. سيفتح التسجيل يوم الجمعة.' : `${stats.unrecorded} غير مسجل · اختر الحالة ثم احفظ التغييرات.`}</p>
      <div className="mt-3">
        <FridayCalendarRibbon selectedDate={date} onSelectDate={value => void chooseDate(value)} attendance={attendance}
          totalYouthCount={youth.length} youth={allYouth} lastFridayDate={lastFridayDate} nextFridayDate={nextFridayDate} />
      </div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 space-y-3">
      <h2 className="text-lg font-bold">ملخص الجلسة</h2>
      <p className="text-xs text-slate-500">{lifecycle.label} · نسبة الحضور من كامل المخدومين المؤهلين للجلسة. تاريخ الانضمام غير المعروف يُعامل كعضوية قائمة.</p>
      {isUpcoming && <div className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-100">الجمعة القادمة محجوزة للمتابعة فقط. انتقل إلى الجمعة الماضية لتسجيل حضور مكتمل.</div>}
      <label className="block text-sm">تاريخ الجلسة <input aria-label="تاريخ الجلسة" type="date" value={date} onChange={e => void chooseDate(e.target.value)} className="rounded-lg border p-2 dark:bg-slate-800" /></label>
      <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-5">
        <p>التسجيل<br /><strong>{stats.recorded} / {youth.length}</strong></p><p>حاضر<br /><strong>{stats.present} ({isUpcoming ? stats.recordedPercentage : stats.percentage}٪)</strong></p><p>غائب<br /><strong>{stats.absent}</strong></p>
        <p>معتذر<br /><strong>{stats.excused}</strong></p><p>غير مسجل<br /><strong>{stats.unrecorded}</strong></p>
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-300">عرض التفصيل والمشاركة</summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">{cohorts.map(cohort => <p key={cohort.schoolYear} className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800">{schoolYearLabel(cohort.schoolYear)}<br /><strong>{cohort.present} / {cohort.total} ({cohort.percentage}٪)</strong></p>)}</div>
          {historical && <span className="text-sm font-bold text-amber-700 dark:text-amber-300">التعديل مفتوح لكل الخدام مع توثيق السبب</span>}
          <div><button className="text-sm underline" onClick={() => void navigator.clipboard.writeText(summary).then(() => setMessage('تم نسخ التقرير.')).catch(e => setError(errorMessage(e)))}>نسخ تقرير الجلسة</button>
          <a className="mr-3 text-sm underline" href={`https://wa.me/?text=${encodeURIComponent(summary)}`} target="_blank" rel="noopener noreferrer">مشاركة عبر واتساب</a></div>
        </div>
      </details>
    </section>
    {error && <p role="alert" className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{message}</p>}
    {draftDates.length > 0 && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
      لديك مسودات غير محفوظة في {draftDates.map(formatDateArabic).join('، ')}. يمكنك الرجوع إلى الجمعة المطلوبة من شريط الاختيار.
    </div>}
    {!!Object.keys(draft ?? {}).length && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
      {Object.keys(draft ?? {}).length} تعديل في مسودة محفوظة على الجهاز؛ لم يُرسل بعد. تبقى المسودة عند التنقل أو استقبال تحديثات أخرى.
      <button className="block underline mt-2" disabled={saving} onClick={() => {
        if (window.confirm('إلغاء مسودة هذه الجلسة وتحميل أحدث البيانات؟')) void discardDraft(date).then(() => ensureSession(date)).catch(e => setError(errorMessage(e)));
      }}>إلغاء مسودة الجلسة وتحميل أحدث سجل</button>
    </div>}
    <div className="flex flex-wrap gap-2">
      <input aria-label="البحث عن مخدوم" placeholder="ابحث بالاسم أو الهاتف" value={search} onChange={e => setSearch(e.target.value)} className="min-w-0 flex-1 rounded-xl border p-3 dark:bg-slate-800" />
      <select aria-label="الفصل الدراسي" value={year} onChange={e => setYear(e.target.value as SchoolYear | 'all')} className="rounded-xl border p-2 dark:bg-slate-800">
        <option value="all">كل الفصول</option>{(['1st Prep', '2nd Prep', '3rd Prep'] as SchoolYear[]).map(y => <option key={y} value={y}>{schoolYearLabel(y)}</option>)}
      </select>
      <button type="button" aria-pressed={unrecordedOnly} onClick={() => setUnrecordedOnly(value => !value)}
        className={`rounded-xl border px-3 py-2 text-sm font-bold ${unrecordedOnly ? 'border-sky-700 bg-sky-700 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
        غير مسجل فقط ({stats.unrecorded})
      </button>
      <button disabled={locked} className="text-sm underline disabled:opacity-40" onClick={() => stageAll('present')}>تسجيل {filtered.length} المعروضين كحاضر</button>
      <button disabled={locked} className="text-sm underline disabled:opacity-40" onClick={() => stageAll(null)}>إزالة تسجيل المعروضين</button>
    </div>
    {!!Object.keys(draft ?? {}).length && (
      <div className="sticky bottom-20 z-30 flex items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-white/95 p-3 text-sm text-slate-800 shadow-lg backdrop-blur dark:border-sky-800 dark:bg-slate-900/95 dark:text-slate-100">
        <div>
          <strong>{Object.keys(draft ?? {}).length} تعديلات</strong>
          <p className="text-xs text-slate-500 dark:text-slate-400">مسودة محفوظة على الجهاز · {formatDateArabic(date)}</p>
        </div>
        <button disabled={locked || saving} onClick={() => historical ? setAuditOpen(true) : void save()} className="shrink-0 rounded-xl bg-sky-700 px-4 py-2.5 font-bold text-white disabled:opacity-40">
          {saving ? 'جارِ الحفظ...' : pending ? 'بانتظار المزامنة' : 'حفظ التغييرات'}
        </button>
      </div>
    )}
    <div className="space-y-3">{filtered.map(member => <AttendanceRow key={member.id} member={member} status={statuses[member.id]} records={attendance} date={date} locked={locked}
      conflict={!!draft?.[member.id] && draft[member.id].expected_version !== (index.byKey.get(attendanceKey(member.id, date))?.version ?? null)} onStatus={changeStatus} onHistory={showHistory} />)}</div>
    {!filtered.length && <p className="p-4 text-center text-sm text-slate-500">لا يوجد مخدومون مطابقون لهذا الاختيار.</p>}
    {auditOpen && <AdminAuditReasonModal key={date} isOpen onClose={() => setAuditOpen(false)} sessionDate={date} isSaving={saving} onConfirm={(category, notes) => void save(category, notes)} />}
    {history && <Portal><div className="fixed inset-0 bg-black/60 grid place-items-center p-4" onClick={() => setHistory(null)}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 dark:bg-slate-900 space-y-3 max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-bold">سجل {history.name}</h2><button data-dialog-close className="rounded-lg px-3 py-2 text-sm underline" aria-label="إغلاق سجل الطالب" onClick={() => setHistory(null)}>إغلاق</button></div>
        <p className="text-xs text-slate-500">يعرض نطاق العام الدراسي وآخر ١٢ أسبوعاً والجلسات التي فتحتها.</p>
        <MemberSparkline youthId={history.id} attendance={attendance} referenceDateStr={date} />
        {(index.byYouth.get(history.id) ?? []).filter(row => row.session_date <= date).map(row => <p key={row.id} className="text-sm border-t py-2">
          {formatDateArabic(row.session_date)} · {statusOptions.find(s => s.value === row.status)?.label} · {servants.find(s => s.id === row.recorded_by)?.name ?? 'غير معروف'}{row.pending ? ' (بانتظار المزامنة)' : ''}
        </p>)}
      </div>
    </div></Portal>}
  </div>;
}
