'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatDateArabic } from '@/lib/utils';
import { YouthWithDetails } from '@/types/database';
import { CrossIcon } from '@/components/CrossIcon';
import {
  Phone,
  MessageCircle,
  CheckCircle2,
  HeartHandshake,
  AlertCircle,
  Bell,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';

interface DailyFollowUpProps {
  onOpenNotifications: () => void;
  onNavigateAttendance: () => void;
}

export function DailyFollowUp({ onOpenNotifications, onNavigateAttendance }: DailyFollowUpProps) {
  const {
    currentServant,
    servants,
    lastFridayDate,
    getAbsentAssignedYouth,
    youth,
    attendance,
    getYouthWithDetails,
    isAdmin,
    contactedYouthIds,
    toggleContactedYouth,
  } = useApp();

  const [viewScope, setViewScope] = useState<'my' | 'all'>('my');

  // Filter absent youth depending on scope
  const absentYouthList: YouthWithDetails[] = React.useMemo(() => {
    if (viewScope === 'all') {
      return youth
        .map(getYouthWithDetails)
        .filter((yd) => {
          const lastAtt = attendance.find(
            (a) => a.youth_id === yd.id && a.session_date === lastFridayDate
          );
          return lastAtt?.status === 'absent';
        });
    } else {
      return getAbsentAssignedYouth(currentServant?.id);
    }
  }, [viewScope, youth, attendance, lastFridayDate, getYouthWithDetails, getAbsentAssignedYouth, currentServant]);

  const totalAssignedToMe = youth.filter(
    (y) => y.assigned_servant_id === currentServant?.id
  ).length;

  const totalAbsents = absentYouthList.length;
  const contactedCount = absentYouthList.filter((y) =>
    contactedYouthIds.includes(y.id)
  ).length;
  const progressPct = totalAbsents > 0 ? Math.round((contactedCount / totalAbsents) * 100) : 100;

  const getWhatsAppLink = (member: YouthWithDetails) => {
    let cleanPhone = member.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
    else if (!cleanPhone.startsWith('20')) cleanPhone = '20' + cleanPhone;

    const formattedDate = formatDateArabic(lastFridayDate);
    const message = `سلام ومحبة يا ${member.name} الغالي ❤️🕊️\nوحشتنا جداً الجمعة اللي فاتت (${formattedDate}) في اجتماع إعدادي بكنيستنا!\nحابب أطمن عليك وعلى دراستك وأفكرك بميعادنا الجمعة القادمة الساعة ٦ مساءً، مستنيينك بكل فرح ومحبة ✨✝️`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const getCallLink = (phone: string) => `tel:${phone.replace(/[^0-9+]/g, '')}`;

  const schoolYearLabel = (year: string) =>
    year === '1st Prep' ? 'أولى إعدادي' : year === '2nd Prep' ? 'ثانية إعدادي' : 'ثالثة إعدادي';

  return (
    <div className="space-y-4 pb-24 animate-fade-in">

      {/* ── Hero Banner ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-950 p-5 text-white shadow-card-lg">

        {/* Decorative ambient glow */}
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-sky-400/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-24 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Subtle Cross Watermark behind content (vector, not emoji) */}
        <div className="absolute -left-6 -bottom-8 w-44 h-44 text-white/5 pointer-events-none select-none">
          <CrossIcon className="w-full h-full" />
        </div>

        {/* Top row */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-sky-100 text-[11px] font-semibold backdrop-blur-sm">
            <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
            متابعة الافتقاد
          </span>
          <span className="text-[11px] text-sky-200/80 bg-sky-950/40 border border-sky-400/15 px-2.5 py-0.5 rounded-lg font-tajawal">
            جمعة {formatDateArabic(lastFridayDate)}
          </span>
        </div>

        {/* Greeting */}
        <div className="relative z-10">
          <h2 className="text-xl sm:text-2xl font-black font-cairo leading-snug">
            سلام ونعمة،<br />
            <span className="text-sky-200">{currentServant?.name} 🌿</span>
          </h2>
          <p className="text-xs text-sky-100/75 mt-2 leading-loose font-tajawal max-w-sm">
            «أَنَا هُوَ الرَّاعِي الصَّالِحُ، وَأَعْرِفُ خَاصَّتِي» — يوحنا ١٠: ١٤
          </p>
        </div>

        {/* Stats row */}
        <div className="relative z-10 grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/15">
          {/* My youth */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/15 shadow-xs">
            <span className="text-[10px] text-sky-100 block font-tajawal mb-0.5">مخدوميك</span>
            <span className="text-xl font-extrabold text-white font-cairo leading-none">{totalAssignedToMe}</span>
          </div>
          {/* Absent */}
          <div className="bg-rose-500/20 backdrop-blur-md border border-rose-300/30 rounded-2xl p-2.5 text-center shadow-xs">
            <span className="text-[10px] text-rose-100 block font-tajawal mb-0.5">غائبين</span>
            <span className="text-xl font-extrabold text-white font-cairo leading-none">{totalAbsents}</span>
          </div>
          {/* Contacted */}
          <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-300/30 rounded-2xl p-2.5 text-center shadow-xs">
            <span className="text-[10px] text-emerald-100 block font-tajawal mb-0.5">تم افتقادهم</span>
            <span className="text-xl font-extrabold text-white font-cairo leading-none" dir="ltr">
              {contactedCount}/{totalAbsents}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {totalAbsents > 0 && (
          <div className="relative z-10 mt-3">
            <div className="flex justify-between text-[10px] text-sky-200/70 mb-1 font-tajawal">
              <span>تقدم الافتقاد</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-sky-400 rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Scope Switcher + Bell ─────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <button
            onClick={() => setViewScope('my')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewScope === 'my'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            مخدوميّ ({getAbsentAssignedYouth(currentServant?.id).length})
          </button>
          <button
            onClick={() => setViewScope('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewScope === 'all'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            الكل ({youth.map(getYouthWithDetails).filter(y => {
              const a = attendance.find(x => x.youth_id === y.id && x.session_date === lastFridayDate);
              return a?.status === 'absent';
            }).length})
          </button>
        </div>

        <button
          onClick={onOpenNotifications}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 text-xs font-semibold transition-colors"
        >
          <Bell className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">تذكير يومي</span>
        </button>
      </div>

      {/* ── Absent List ──────────────────────────────── */}
      <div className="space-y-2.5">
        {/* Section header */}
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider font-tajawal">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            يحتاجون افتقاد
          </h3>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {totalAbsents}
          </span>
        </div>

        {absentYouthList.length === 0 ? (
          /* ── Empty state ── */
          <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-4xl flex items-center justify-center mb-4 animate-float">
              🎉
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 font-cairo">
              نشكر الرب! لا يوجد غيابات
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-xs mx-auto font-tajawal leading-relaxed px-4">
              {viewScope === 'my'
                ? 'جميع مخدوميك حضروا اجتماع الجمعة الماضي بفضل الله.'
                : 'جميع مخدومي الخدمة حضروا الجمعة الماضية.'}
            </p>
            <button
              onClick={onNavigateAttendance}
              className="mt-5 px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-sky-glow inline-flex items-center gap-1.5 active:scale-95"
            >
              <span>تسجيل حضور جمعة جديدة</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* ── Youth cards ── */
          <div className="space-y-2.5">
            {absentYouthList.map((member) => {
              const isContacted = contactedYouthIds.includes(member.id);
              const assignedServantObj = servants.find(s => s.id === member.assigned_servant_id);

              return (
                <div
                  key={member.id}
                  className={`relative rounded-3xl border transition-all duration-300 overflow-hidden ${
                    isContacted
                      ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-card hover:shadow-card-lg hover:-translate-y-0.5'
                  }`}
                >
                  {/* Left accent stripe */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-full ${
                    isContacted ? 'bg-emerald-400' : 'bg-rose-400'
                  }`} />

                  <div className="p-4 pl-5">
                    {/* Top row: avatar + info + badge */}
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 ${
                        isContacted
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                      }`}>
                        {isContacted
                          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          : <span>{member.name.charAt(0)}</span>}
                      </div>

                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold font-cairo transition-all ${
                            isContacted
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}>
                            {member.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 font-semibold border border-sky-200/60 dark:border-sky-800/40">
                            {schoolYearLabel(member.school_year)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                            {member.phone}
                          </span>
                          {viewScope === 'all' && assignedServantObj && (
                            <span className="text-[10px] text-slate-400 font-tajawal">
                              • {assignedServantObj.name.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Absence badge */}
                      <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 font-bold whitespace-nowrap">
                        غائب
                      </span>
                    </div>

                    {/* Pastoral notes */}
                    {member.notes && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-tajawal leading-relaxed">
                        <span className="font-bold text-slate-700 dark:text-slate-200">ملاحظات: </span>
                        {member.notes}
                      </div>
                    )}

                    {/* Action row */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      {/* Mark contacted */}
                      <button
                        onClick={() => toggleContactedYouth(member.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                          isContacted
                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isContacted ? 'text-white' : 'text-slate-400'}`} />
                        <span>{isContacted ? 'تم الافتقاد ✓' : 'تم الافتقاد؟'}</span>
                      </button>

                      {/* Direct links */}
                      <div className="flex items-center gap-1.5">
                        <a
                          href={getCallLink(member.phone)}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold transition-all active:scale-95"
                        >
                          <Phone className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>اتصال</span>
                        </a>
                        <a
                          href={getWhatsAppLink(member)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all active:scale-95 shadow-sm shadow-emerald-600/25"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-white stroke-none" />
                          <span>واتساب</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
