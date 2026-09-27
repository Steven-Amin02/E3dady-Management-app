'use client';

import { useState, useEffect } from 'react';
import { Bell, Sparkles, Send } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Portal } from '@/components/Portal';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const { currentServant, getAbsentAssignedYouth } = useApp();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
          sendTestNotification();
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    } else {
      alert('متصفحك لا يدعم خاصية Notification API');
    }
  };

  const sendTestNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const absentCount = getAbsentAssignedYouth(currentServant?.id).length;
      const title = '🕊️ تذكير خدمة إعدادي: افتقاد الجمعة';
      const body = ` مساء الخير يا ${currentServant?.name}، لديك ${absentCount} مخدومين بحاجة للافتقاد هذا الأسبوع. ادخل للاطمئنان عليهم!`;

      try {
        new Notification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          dir: 'rtl',
          lang: 'ar',
        });
        setTestSent(true);
        setTimeout(() => setTestSent(false), 4000);
      } catch (err) {
        console.warn('Native notification failed, testing via Service Worker:', err);
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-192x192.png',
              dir: 'rtl',
              lang: 'ar',
            });
            setTestSent(true);
            setTimeout(() => setTestSent(false), 4000);
          });
        }
      }
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
                  حالة إشعارات المتصفح (Web Notification):
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${permission === 'granted'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : permission === 'denied'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                >
                  {permission === 'granted'
                    ? 'مفعلة ✓'
                    : permission === 'denied'
                      ? 'محظورة ✕'
                      : 'غير محددة'}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-tajawal leading-relaxed">
                يُرسل النظام تذكيراً دورياً بالهاتف للخادم كل أسبوع لتفقد المخدومين الغائبين والتواصل معهم.
              </p>

              <div className="flex items-center gap-2 pt-1">
                {permission !== 'granted' ? (
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
                    onClick={sendTestNotification}
                    className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إرسال إشعار تجريبي فوري</span>
                  </button>
                )}
              </div>

              {testSent && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 text-center font-bold animate-pulse">
                  تم إرسال الإشعار بنجاح! راجع شريط إشعارات جهازك الآن.
                </p>
              )}
            </div>

            {/* OneSignal Cloud Free-Tier Integration Info */}
            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-2 text-xs font-tajawal text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-sky-800 dark:text-sky-300 font-cairo">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>تكامل OneSignal المجاني بالكامل (100% Free):</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                لإرسال إشعارات جماعية حتى عندما يكون التطبيق مغلقاً تماماً، يمكنك إنشاء حساب OneSignal مجاني (يغطي حتى 10,000 مشترك مجاناً) ووضع:
              </p>
              <code className="block bg-slate-900 text-sky-300 p-2 rounded-xl text-[10px] font-mono text-left" dir="ltr">
                NEXT_PUBLIC_ONESIGNAL_APP_ID=your-id
              </code>
            </div>
          </div>

          <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              تم
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
