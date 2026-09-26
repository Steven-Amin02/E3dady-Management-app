'use client';

import React, { useState } from 'react';
import { PastoralOutcomeCategory, Youth } from '@/types/database';
import { PASTORAL_OUTCOME_OPTIONS } from '@/lib/pastoralAnalytics';
import { triggerHaptic } from '@/lib/utils';
import { X, Check, MessageSquare, Phone, Sparkles } from 'lucide-react';
import { Portal } from '@/components/Portal';

interface PastoralOutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  youth: Youth;
  initialMethod?: 'call' | 'whatsapp';
  onConfirm: (outcome: PastoralOutcomeCategory, method: 'call' | 'whatsapp', notes: string) => Promise<void>;
}

export function PastoralOutcomeModal({
  isOpen,
  onClose,
  youth,
  initialMethod = 'call',
  onConfirm,
}: PastoralOutcomeModalProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<PastoralOutcomeCategory>('encouraged_attending');
  const [method, setMethod] = useState<'call' | 'whatsapp'>(initialMethod);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectOutcome = (cat: PastoralOutcomeCategory) => {
    triggerHaptic('light');
    setSelectedOutcome(cat);
  };

  const handleSave = async () => {
    triggerHaptic('success');
    try {
      setIsSubmitting(true);
      await onConfirm(selectedOutcome, method, notes.trim());
      onClose();
    } catch (err) {
      console.error('Error saving pastoral outcome:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col my-auto max-h-[calc(100dvh-2rem)] overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between p-5 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-cairo">
              <Sparkles className="w-3 h-3 text-sky-500" />
              توثيق نتيجة الافتقاد الرعوي
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 font-cairo">
              افتقاد: {youth.name}
            </h3>
            <p className="text-xs text-slate-500 font-tajawal">
              حدد النتيجة الدقيقة للتواصل لتسجيلها في ملف المخدوم ومشاركتها مع فريق الخدام
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Contact Method Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-cairo">
            وسيلة التواصل:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setMethod('call');
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold font-cairo flex items-center justify-center gap-2 transition-all ${
                method === 'call'
                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 ring-2 ring-sky-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>مكالمة هاتفية</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setMethod('whatsapp');
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold font-cairo flex items-center justify-center gap-2 transition-all ${
                method === 'whatsapp'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>رسالة واتساب</span>
            </button>
          </div>
        </div>

        {/* 1-Tap Outcome Grid */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-cairo">
            تصنيف نتيجة الافتقاد:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PASTORAL_OUTCOME_OPTIONS.map((opt) => {
              const isSelected = selectedOutcome === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOutcome(opt.id)}
                  className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 relative active:scale-98 ${
                    isSelected
                      ? `${opt.colorClass} ring-2 ring-sky-500/40 shadow-sm`
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-lg shrink-0">{opt.icon}</span>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="text-xs font-bold font-cairo truncate">
                      {opt.label}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-tajawal leading-tight">
                      {opt.description}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Follow-up Note Textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-cairo">
            ملاحظات إضافية عن الافتقاد (اختياري):
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: تحدثت مع والدته وأكدت استعداده للحضور الجمعة القادمة، يحتاج صلاة للامتحانات..."
            className="w-full text-xs font-tajawal rounded-xl p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 p-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 font-bold font-cairo text-xs text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'جارِ الحفظ...' : 'تأكيد وحفظ النتيجة الرعوية'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold font-cairo text-slate-700 dark:text-slate-300 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  </Portal>
);
}
