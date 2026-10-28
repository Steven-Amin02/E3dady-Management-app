"use client";

import { useState } from "react";
import { Bell, Send } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Portal } from "@/components/Portal";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const { currentServant, getAbsentAssignedYouth } = useApp((state) => ({
    currentServant: state.currentServant,
    getAbsentAssignedYouth: state.getAbsentAssignedYouth,
  }));
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification === "undefined" ? "default" : Notification.permission,
  );
  const [testSent, setTestSent] = useState(false);
  const [error, setError] = useState("");
  const absentYouth = getAbsentAssignedYouth(currentServant?.id);
  const nextYouth = absentYouth[0];

  if (!isOpen) return null;

  const requestBrowserPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === "granted") {
          void sendTestNotification();
        }
      } catch {
        setError(
          "تعذر تفعيل الإشعارات. تحقق من إعدادات المتصفح ثم حاول مرة أخرى.",
        );
      }
    } else {
      setError("هذا المتصفح لا يدعم إشعارات الجهاز.");
    }
  };

  const sendTestNotification = async () => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;
    const title = nextYouth ? `اتواصل مع ${nextYouth.name}` : "بفكرك بالمتابعة";
    const body = nextYouth
      ? `اتصل بـ ${nextYouth.name} اليوم للاطمئنان عليه. لديك ${absentYouth.length} شابًا يحتاج إلى افتقاد.`
      : "لا يوجد شاب غائب حاليًا. افتح التطبيق لمراجعة قائمة مخدوميك.";
    const options = {
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      dir: "rtl" as const,
      lang: "ar",
      data: { url: "/?tab=followup", youthId: nextYouth?.id ?? null },
    };

    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
      } else {
        new Notification(title, options);
      }
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    } catch {
      setError(
        "تعذر إرسال الإشعار. تأكد من تثبيت التطبيق والسماح بإشعارات الجهاز.",
      );
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col my-auto max-h-[calc(100dvh-2rem)] overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-cairo">
                إشعارات وتذكيرات الافتقاد
              </h3>
            </div>
            <button
              type="button"
              data-dialog-close
              aria-label="إغلاق تذكيرات الافتقاد"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-4">
            {/* Browser Native Notification Status */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-cairo">
                  حالة إشعارات الجهاز:
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    permission === "granted"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : permission === "denied"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {permission === "granted"
                    ? "مفعلة ✓"
                    : permission === "denied"
                      ? "محظورة ✕"
                      : "غير محددة"}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-tajawal leading-relaxed">
                يمكنك تفعيل إشعارات الجهاز لتذكيرك باسم شاب محدد يحتاج إلى
                الاتصال به. الإرسال الحالي تجريبي أثناء فتح التطبيق.
              </p>

              <div className="flex items-center gap-2 pt-1">
                {permission !== "granted" ? (
                  <button
                    type="button"
                    onClick={requestBrowserPermission}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-sm"
                  >
                    تفعيل الإشعارات الآن
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void sendTestNotification()}
                    className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إرسال تذكير باسم شاب الآن</span>
                  </button>
                )}
              </div>

              {testSent && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 text-center font-bold animate-pulse">
                  تم إرسال التذكير. إذا لم يظهر، راجع إعدادات إشعارات الجهاز.
                </p>
              )}
              {error && (
                <p role="alert" className="text-xs font-bold text-rose-600">
                  {error}
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-sky-50 p-4 text-xs text-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
              {nextYouth ? (
                <>
                  التذكير المقترح الآن: <strong>{nextYouth.name}</strong>
                </>
              ) : (
                "لا يوجد حاليًا شاب غائب يحتاج إلى افتقاد."
              )}
            </div>
          </div>

          <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
