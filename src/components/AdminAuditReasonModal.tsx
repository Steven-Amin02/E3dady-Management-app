'use client';

import { useState, type FormEvent } from 'react';
import { AUDIT_REASON_OPTIONS, AuditReasonCategory } from '@/lib/fridayCalendar';
import { formatDateArabic } from '@/lib/utils';
import { ShieldAlert, Check, X, FileText } from 'lucide-react';
import { Portal } from '@/components/Portal';

interface AdminAuditReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reasonCategory: AuditReasonCategory, notes: string) => void;
  sessionDate: string;
  isSaving?: boolean;
}

export function AdminAuditReasonModal({
  isOpen,
  onClose,
  onConfirm,
  sessionDate,
  isSaving,
}: AdminAuditReasonModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<AuditReasonCategory>('guardian_verified');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onConfirm(selectedCategory, notes.trim());
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col my-auto max-h-[calc(100dvh-2rem)] overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 p-5 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 font-cairo">
                توثيق تعديل السجل التاريخي
              </h3>
              <p className="text-xs text-slate-500 font-tajawal">
                {formatDateArabic(sessionDate)} • صلاحية أمين خدمة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Warning info */}
              <p className="text-xs text-slate-600 dark:text-slate-300 font-tajawal leading-relaxed bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-900/60">
                تعديل سجل مؤرشف يتطلب توثيق السبب لحماية أمان الأرشيف السنوي وسيقيد باسمك في سجل التدقيق التاريخي.
              </p>

              {/* Reason categories */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-cairo block">
                  سبب التعديل الاستثنائي:
                </label>
                <div className="space-y-1.5">
                  {AUDIT_REASON_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                        selectedCategory === opt.id
                          ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-400 dark:border-sky-700 text-sky-900 dark:text-sky-200 font-bold shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="audit_reason"
                        checked={selectedCategory === opt.id}
                        onChange={() => setSelectedCategory(opt.id)}
                        className="accent-sky-600 w-4 h-4"
                      />
                      <span>{opt.icon}</span>
                      <span className="font-tajawal flex-1">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-cairo flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>ملاحظات توضيحية إضافية (اختياري):</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اكتب توضيحاً إضافياً إن لزم الأمر..."
                  className="w-full bg-slate-50 dark:bg-slate-800 text-xs rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-tajawal resize-none"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 p-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold font-cairo text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold font-cairo text-white bg-sky-600 hover:bg-sky-700 shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'جارِ التوثيق والحفظ...' : 'تأكيد وحفظ السجل التاريخي'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
