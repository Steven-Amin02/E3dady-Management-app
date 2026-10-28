"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  formatDateArabic,
  toLocalDateString,
  schoolYearLabel,
  formatEgyptianPhoneForWhatsApp,
  getTimeBasedGreeting,
} from "@/lib/utils";
import { DailyFollowUpCandidate } from "@/lib/followUpRotation";
import { MemberSparkline } from "@/components/MemberSparkline";
import { PastoralOutcomeModal } from "@/components/PastoralOutcomeModal";
import {
  PASTORAL_TRIAGE_CONFIG,
  PASTORAL_OUTCOME_OPTIONS,
} from "@/lib/pastoralAnalytics";
import { PastoralOutcomeCategory } from "@/types/database";
import {
  Phone,
  MessageCircle,
  CheckCircle2,
  Sparkles,
  UserCheck,
  FileCheck2,
  Activity,
  HeartHandshake,
} from "lucide-react";

interface DailySingleFollowUpCardProps {
  candidate: DailyFollowUpCandidate | null;
  onOpenSharedAttendance?: () => void;
}

export function DailySingleFollowUpCard({
  candidate,
}: DailySingleFollowUpCardProps) {
  const { attendance, markYouthContacted, getYouthWithDetails } = useApp(
    (state) => ({
      attendance: state.attendance,
      markYouthContacted: state.markYouthContacted,
      getYouthWithDetails: state.getYouthWithDetails,
    }),
  );
  const [isMarkingDone, setIsMarkingDone] = useState(false);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"call" | "whatsapp">(
    "call",
  );
  const [loggedOutcome, setLoggedOutcome] =
    useState<PastoralOutcomeCategory | null>(null);

  if (!candidate) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-card text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
          <UserCheck className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-cairo">
          لا يوجد شباب مسندين لك حالياً
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto font-tajawal">
          لم يتم تعيين مخدومين في قائمتك بعد. يمكنك توزيع المخدومين من شاشة دليل
          المخدومين أو الخدام.
        </p>
      </div>
    );
  }

  const {
    youth,
    lastFridayDate,
    isAbsentLastFriday,
    alreadyContactedToday,
    selectionReason,
    triageCategory,
  } = candidate;

  const triageMeta =
    PASTORAL_TRIAGE_CONFIG[triageCategory] ||
    PASTORAL_TRIAGE_CONFIG.regular_active;

  // Clean Egyptian phone format
  const cleanPhone = formatEgyptianPhoneForWhatsApp(youth.phone);

  // Personalized Arabic WhatsApp message tailored to triage context
  const formattedDate = formatDateArabic(lastFridayDate);
  const timeGreeting = getTimeBasedGreeting();
  let messageText = "";
  if (triageCategory === "critical_dropout") {
    messageText = `سلام ومحبة يا ${youth.name} الغالي ❤️🕊️\nوحشتنا جداً وكل الخدام بيسألوا عليك! مكانك فارق معانا جداً في اجتماع إعدادي بكنيستنا.\nحابب أطمن عليك وعلى صحتك ودراستك، ومستنيك الجمعة القادمة بكل محبة وفرح ✨✝️`;
  } else if (triageCategory === "newcomer_risk") {
    messageText = `${timeGreeting} يا ${youth.name} الحبيب 🌿✨\nفرحنا بوجودك جداً في اللقاءات السابقة، ووحشتنا الجمعة الماضية!\nمستنيينك الجمعة الجاية مجهزين فقرات ومسابقات مميزة علشانك ❤️🕊️`;
  } else if (isAbsentLastFriday) {
    messageText = `سلام ومحبة يا ${youth.name} الغالي ❤️🕊️\nوحشتنا الجمعة الماضية (${formattedDate}) في اجتماع إعدادي بكنيستنا!\nحابب أطمن عليك وعلى دراستك وأفكرك بميعادنا الجمعة القادمة، مستنيينك بكل فرح ✨✝️`;
  } else {
    messageText = `${timeGreeting} يا ${youth.name} الحبيب ❤️🕊️\nأخبارك إيه في دراستك وأيامك؟ حبيت أفتقدك وأطمن عليك وعلى أسرتك الكريمة.\nربنا معاك ويفرح قلبك دايماً، ومستنيك في ميعادنا الجمعة القادمة باجتماع إعدادي ✨✝️`;
  }

  const whatsAppUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : "#";
  const callUrl = youth.phone
    ? `tel:${youth.phone.replace(/[^0-9+]/g, "")}`
    : "#";

  // schoolYearLabel imported from @/lib/utils

  const handleOutcomeConfirm = async (
    outcome: PastoralOutcomeCategory,
    method: "call" | "whatsapp",
    notes: string,
  ) => {
    setIsMarkingDone(true);
    try {
      await markYouthContacted(youth.id, method, notes, outcome);
      setLoggedOutcome(outcome);
    } finally {
      setIsMarkingDone(false);
    }
  };

  // Format last contacted date
  let lastContactLabel = "لم يتم افتقاده من قبل";
  if (youth.last_contacted_at) {
    const contactDate = new Date(youth.last_contacted_at);
    lastContactLabel = `آخر افتقاد: ${formatDateArabic(toLocalDateString(contactDate))}`;
  }

  const latestOutcome =
    loggedOutcome ?? getYouthWithDetails(youth).last_follow_up_outcome;
  const outcomeInfo = latestOutcome
    ? PASTORAL_OUTCOME_OPTIONS.find((o) => o.id === latestOutcome)
    : null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-card transition-all duration-300">
      {/* Top Gradient Banner / Accent Line */}
      <div
        className={`h-2.5 w-full ${
          triageCategory === "critical_dropout"
            ? "bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500"
            : triageCategory === "newcomer_risk"
              ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600"
              : triageCategory === "fading_regular"
                ? "bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600"
                : "bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-600"
        }`}
      />

      <div className="p-5 sm:p-6 space-y-4">
        {/* Card Header & Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-cairo bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60">
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                شاب اليوم للافتقاد
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 font-cairo tracking-tight pt-1">
              {youth.name}
            </h2>
          </div>

          {/* School Year Pill */}
          <span className="shrink-0 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold font-tajawal border border-slate-200/80 dark:border-slate-700/80">
            {schoolYearLabel(youth.school_year)}
          </span>
        </div>

        <details className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <summary className="cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-300">
            عرض حضور الشاب
          </summary>
          <div className="mt-3 space-y-3">
            {/* ── STAGE 3: 12-Week Longitudinal Micro-Sparkline Strip ── */}
            <div className="rounded-2xl border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold font-cairo text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-500" />
                  <span>شريط حضور آخر ١٢ أسبوع:</span>
                </span>
                <span className="text-[11px] text-slate-400 font-tajawal font-normal">
                  أحدث جمعة في أقصى اليمين
                </span>
              </div>

              <MemberSparkline
                youthId={youth.id}
                attendance={attendance}
                windowSize={12}
                referenceDateStr={lastFridayDate}
                showConsistencyBadge={true}
                showStreakBadge={true}
              />
            </div>

            {/* ── Risk Reason & Pastoral Recommendation ── */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-tajawal">
                  سبب توجيه الافتقاد:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-cairo">
                  {selectionReason}
                </span>
              </div>
              <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-tajawal leading-relaxed">
                <HeartHandshake className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                <span>نصيحة رعوية: {triageMeta.actionRecommendation}</span>
              </div>
            </div>

            {/* Previous contact tag & phone */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
              <div className="flex items-center gap-1.5 font-tajawal">
                <span>{lastContactLabel}</span>
              </div>
              {youth.phone && (
                <div
                  className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300"
                  dir="ltr"
                >
                  {youth.phone}
                </div>
              )}
            </div>
          </div>
        </details>

        {/* ── Today Contact Completed Banner with Logged Outcome ── */}
        {alreadyContactedToday && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-0.5 flex-1">
                <p className="text-xs font-bold font-cairo">
                  تم تسجيل افتقاد اليوم؛ راجع حالة المزامنة لتأكيد الحفظ
                  السحابي.
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-tajawal">
                  سيتغير شاب الافتقاد تلقائياً غداً وفقاً لدورية الرعاية وتصنيف
                  المخاطر.
                </p>
              </div>
            </div>

            {outcomeInfo && (
              <div className="flex items-center gap-2 pt-1 border-t border-emerald-500/20 text-xs">
                <span className="font-tajawal text-slate-600 dark:text-slate-300">
                  النتيجة الموثقة:
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold font-cairo ${outcomeInfo.badgeBg}`}
                >
                  <span>{outcomeInfo.icon}</span>
                  <span>{outcomeInfo.label}</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Action Buttons ───────────────────────── */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* WhatsApp Direct */}
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold font-cairo text-sm text-white shadow-sm transition-all duration-200 active:scale-95 ${
              cleanPhone
                ? "bg-emerald-700 hover:bg-emerald-800 hover:shadow-emerald-500/20"
                : "bg-slate-300 dark:bg-slate-700 pointer-events-none"
            }`}
          >
            <MessageCircle className="w-4 h-4 fill-white shrink-0" />
            <span>واتساب</span>
          </a>

          {/* Call Direct */}
          <a
            href={callUrl}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold font-cairo text-sm text-white shadow-sm transition-all duration-200 active:scale-95 ${
              youth.phone
                ? "bg-sky-700 hover:bg-sky-800 hover:shadow-sky-500/20"
                : "bg-slate-300 dark:bg-slate-700 pointer-events-none"
            }`}
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span>اتصال</span>
          </a>
        </div>

        {/* ── STAGE 3: 1-Tap Pastoral Outcome Classification Button ──── */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isMarkingDone || alreadyContactedToday}
            onClick={() => {
              setSelectedMethod("call");
              setIsOutcomeModalOpen(true);
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-800 dark:text-sky-200 text-xs font-bold font-cairo flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-xs"
          >
            <FileCheck2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>
              {isMarkingDone
                ? "جارِ التوثيق..."
                : "سجّل نتيجة التواصل بعد العودة"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Pastoral Outcome Modal ── */}
      {isOutcomeModalOpen && (
        <PastoralOutcomeModal
          key={youth.id + selectedMethod}
          isOpen={isOutcomeModalOpen}
          onClose={() => setIsOutcomeModalOpen(false)}
          youth={youth}
          initialMethod={selectedMethod}
          onConfirm={handleOutcomeConfirm}
        />
      )}
    </div>
  );
}
