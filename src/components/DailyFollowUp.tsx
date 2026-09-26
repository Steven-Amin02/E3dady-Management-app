'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatDateArabic } from '@/lib/utils';
import { YouthWithDetails } from '@/types/database';
import { CrossIcon } from '@/components/CrossIcon';
import { DailySingleFollowUpCard } from '@/components/DailySingleFollowUpCard';
import { MemberSparkline } from '@/components/MemberSparkline';
import {
  Phone,
  MessageCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronDown,
  Users,
  AlertCircle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface DailyFollowUpProps {
  onOpenNotifications: () => void;
  onNavigateAttendance: () => void;
}

export function DailyFollowUp({ onOpenNotifications, onNavigateAttendance }: DailyFollowUpProps) {
  const {
    currentServant,
    lastFridayDate,
    dailyFollowUpYouth,
    getAbsentAssignedYouth,
    youth,
    attendance,
    getYouthWithDetails,
  } = useApp();

  const [showAllAbsents, setShowAllAbsents] = useState(false);

  // Total youth assigned to this servant
  const totalAssignedToMe = youth.filter(
    (y) => y.assigned_servant_id === currentServant?.id
  ).length;

  // Other absent assigned youth for this servant
  const absentAssignedYouth = getAbsentAssignedYouth(currentServant?.id);

  const getWhatsAppLink = (member: YouthWithDetails) => {
    let cleanPhone = member.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
    else if (cleanPhone.length > 0 && !cleanPhone.startsWith('20')) cleanPhone = '20' + cleanPhone;

    const formattedDate = formatDateArabic(lastFridayDate);
    const message = `سلام ومحبة يا ${member.name} الغالي ❤️🕊️\nوحشتنا جداً الجمعة الماضية (${formattedDate}) في اجتماع إعدادي بكنيستنا!\nحابب أطمن عليك وأفكرك بميعادنا الجمعة القادمة، مستنيينك بكل فرح ✨✝️`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
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
    <div className="space-y-5 pb-24 animate-fade-in">
      {/* ── Hero Banner ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-950 p-5 text-white shadow-card-lg">
        {/* Ambient Glow */}
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-sky-400/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-24 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Watermark Cross */}
        <div className="absolute -left-6 -bottom-8 w-44 h-44 text-white/5 pointer-events-none select-none">
          <CrossIcon className="w-full h-full" />
        </div>

        {/* Top row */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-sky-100 text-[11px] font-semibold backdrop-blur-sm">
            <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
            المتابعة اليومية الفردية
          </span>
          <span className="text-[11px] text-sky-200/80 bg-sky-950/40 border border-sky-400/15 px-2.5 py-0.5 rounded-lg font-tajawal">
            آخر جمعة: {formatDateArabic(lastFridayDate)}
          </span>
        </div>

        {/* Servant greeting */}
        <div className="relative z-10">
          <h2 className="text-xl sm:text-2xl font-black font-cairo leading-snug">
            سلام ونعمة،<br />
            <span className="text-sky-200">{currentServant?.name || 'يا خادم المسيح'} 🌿</span>
          </h2>
          <p className="text-xs text-sky-100/80 mt-1.5 leading-relaxed font-tajawal max-w-sm">
            «أَنَا هُوَ الرَّاعِي الصَّالِحُ، وَأَعْرِفُ خَاصَّتِي» — يوحنا ١٠: ١٤
          </p>
        </div>

        {/* Summary Badges */}
        <div className="relative z-10 grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/15">
            <span className="text-[11px] text-sky-100 block font-tajawal mb-0.5">مخدوميك بالأسرة</span>
            <span className="text-lg font-black text-white font-mono">{totalAssignedToMe}</span>
          </div>

          <div className="bg-rose-500/20 backdrop-blur-md border border-rose-300/30 rounded-2xl p-2.5 text-center">
            <span className="text-[11px] text-rose-100 block font-tajawal mb-0.5">غائبين الجمعة الماضية</span>
            <span className="text-lg font-black text-white font-mono">{absentAssignedYouth.length}</span>
          </div>
        </div>
      </div>

      {/* ── 1-PERSON DAILY ACTION CARD ───────────────────── */}
      <div className="space-y-2">
        <DailySingleFollowUpCard
          candidate={dailyFollowUpYouth}
          onOpenSharedAttendance={onNavigateAttendance}
        />
      </div>

      {/* ── Shared Fellowship Quick Link ─────────────────── */}
      <div
        onClick={onNavigateAttendance}
        className="cursor-pointer group p-4 rounded-3xl bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800/80 border border-sky-100 dark:border-slate-800 hover:border-sky-300 dark:hover:border-slate-700 transition-all shadow-sm flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-cairo">
              كشف الحضور العام لجميع المخدومين
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-tajawal">
              تسجيل ومتابعة حضور لقاء الجمعة المشترك لجميع الخدام ({youth.length} مخدوم)
            </p>
          </div>
        </div>

        <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-sky-600 transition-colors" />
      </div>

      {/* ── Collapsible: Other Absent Youth in my list ───── */}
      {absentAssignedYouth.length > 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-card space-y-3">
          <button
            type="button"
            onClick={() => setShowAllAbsents(!showAllAbsents)}
            className="w-full flex items-center justify-between text-right"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-cairo">
                باقي الغائبين من مخدوميك ({absentAssignedYouth.length - (dailyFollowUpYouth?.isAbsentLastFriday ? 1 : 0)})
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showAllAbsents ? 'rotate-180' : ''}`} />
          </button>

          {showAllAbsents && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {absentAssignedYouth
                .filter((yd) => yd.id !== dailyFollowUpYouth?.youth.id)
                .map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100 font-cairo">
                        {member.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-tajawal">
                        {schoolYearLabel(member.school_year)}
                      </div>
                      <div className="pt-0.5">
                        <MemberSparkline
                          youthId={member.id}
                          attendance={attendance}
                          windowSize={8}
                          compact={true}
                          showStreakBadge={false}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {member.phone && (
                        <>
                          <a
                            href={getWhatsAppLink(member)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                            title="واتساب"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                          <a
                            href={`tel:${member.phone}`}
                            className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 hover:bg-sky-100"
                            title="اتصال"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
