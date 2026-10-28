"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  formatDateArabic,
  schoolYearLabel,
  formatEgyptianPhoneForWhatsApp,
  getTimeBasedGreeting,
} from "@/lib/utils";
import { eligibleYouth } from "@/lib/attendanceModel";
import { YouthWithDetails } from "@/types/database";
import { DailySingleFollowUpCard } from "@/components/DailySingleFollowUpCard";
import { MemberSparkline } from "@/components/MemberSparkline";
import { Portal } from "@/components/Portal";
import { Phone, MessageCircle, ChevronLeft, X, Users } from "lucide-react";

interface DailyFollowUpProps {
  onOpenNotifications: () => void;
  onNavigateAttendance: () => void;
}

export function DailyFollowUp({ onNavigateAttendance }: DailyFollowUpProps) {
  const {
    currentServant,
    lastFridayDate,
    dailyFollowUpYouth,
    getAbsentAssignedYouth,
    youth: allYouth,
    today,
    attendance,
  } = useApp((state) => ({
    currentServant: state.currentServant,
    lastFridayDate: state.lastFridayDate,
    dailyFollowUpYouth: state.dailyFollowUpYouth,
    getAbsentAssignedYouth: state.getAbsentAssignedYouth,
    youth: state.youth,
    today: state.today,
    attendance: state.attendance,
  }));

  const [showAbsentSheet, setShowAbsentSheet] = useState(false);
  const greeting = getTimeBasedGreeting();
  const youth = eligibleYouth(allYouth, today);

  // Total youth assigned to this servant
  const totalAssignedToMe = youth.filter(
    (y) => y.assigned_servant_id === currentServant?.id,
  ).length;

  // Other absent assigned youth for this servant
  const absentAssignedYouth = getAbsentAssignedYouth(currentServant?.id);
  const assignedYouth = youth.filter(
    (member) => member.assigned_servant_id === currentServant?.id,
  );
  const otherAssignedYouth = assignedYouth.filter(
    (member) => member.id !== dailyFollowUpYouth?.youth.id,
  );

  const getWhatsAppLink = (member: YouthWithDetails) => {
    const cleanPhone = formatEgyptianPhoneForWhatsApp(member.phone);
    const formattedDate = formatDateArabic(lastFridayDate);
    const message = `سلام ومحبة يا ${member.name} الغالي\nوحشتنا جداً الجمعة الماضية (${formattedDate}) في اجتماع إعدادي بكنيستنا!\nحابب أطمن عليك وأفكرك بميعادنا الجمعة القادمة، مستنيينك بكل فرح`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };
  return (
    <div className="space-y-4 pb-40 animate-fade-in">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-bold text-sky-700 dark:text-sky-300">
          اليوم · {formatDateArabic(lastFridayDate)}
        </p>
        <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">
          {greeting}، {currentServant?.name || "يا خادم المسيح"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          مهمتك التالية في خطوة واحدة.
        </p>
        <div className="mt-3 flex gap-2 text-xs">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
            مخدوموك: {totalAssignedToMe}
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
            غياب سابق: {absentAssignedYouth.length}
          </span>
        </div>
      </section>

      {/* ── 1-PERSON DAILY ACTION CARD ───────────────────── */}
      <div className="space-y-2">
        <DailySingleFollowUpCard
          key={(dailyFollowUpYouth?.youth.id ?? "none") + today}
          candidate={dailyFollowUpYouth}
          onOpenSharedAttendance={onNavigateAttendance}
        />
      </div>

      {/* ── Shared Fellowship Quick Link ─────────────────── */}
      <button
        type="button"
        onClick={onNavigateAttendance}
        className="w-full text-right cursor-pointer group p-4 rounded-3xl bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800/80 border border-sky-100 dark:border-slate-800 hover:border-sky-300 dark:hover:border-slate-700 transition-all shadow-sm flex items-center justify-between"
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
              تسجيل ومتابعة حضور لقاء الجمعة المشترك لجميع الخدام (
              {youth.length} مخدوم)
            </p>
          </div>
        </div>

        <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-sky-600 transition-colors" />
      </button>

      {otherAssignedYouth.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowAbsentSheet(true)}
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-30 flex items-center justify-between rounded-2xl border border-sky-200 bg-white/95 px-4 py-3 text-right shadow-lg backdrop-blur dark:border-sky-900 dark:bg-slate-900/95"
            aria-haspopup="dialog"
          >
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-600" />
              <span>
                <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
                  باقي الشباب اللي معاك في المتابعة
                </span>
                <span className="block text-xs text-slate-500">
                  الشباب الموجودون معك والتواصل معهم
                </span>
              </span>
            </span>
            <span className="rounded-full bg-sky-700 px-2.5 py-1 text-xs font-bold text-white">
              {otherAssignedYouth.length}
            </span>
          </button>

          {showAbsentSheet && (
            <Portal>
              <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45">
                <button
                  type="button"
                  aria-label="إغلاق القائمة"
                  className="absolute inset-0 h-full w-full cursor-default"
                  onClick={() => setShowAbsentSheet(false)}
                />
                <section
                  className="relative max-h-[82vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] dark:bg-slate-900"
                  aria-label="باقي مخدوميك"
                >
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                        باقي مخدوميك
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        الشباب الموجودون معك في قائمة الخدمة
                      </p>
                    </div>
                    <button
                      type="button"
                      data-dialog-close
                      onClick={() => setShowAbsentSheet(false)}
                      aria-label="إغلاق القائمة"
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {otherAssignedYouth.map((member) => (
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
                </section>
              </div>
            </Portal>
          )}
        </>
      )}
    </div>
  );
}
