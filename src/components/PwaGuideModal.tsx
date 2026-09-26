'use client';

import React from 'react';
import { Smartphone, Share, PlusSquare, CheckCircle, Download } from 'lucide-react';

interface PwaGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PwaGuideModal({ isOpen, onClose }: PwaGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-cairo">
              تثبيت التطبيق على الموبايل (PWA)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 font-tajawal leading-relaxed">
          تطبيق خدمة إعدادي مبرمج كـ Progressive Web App (PWA) ليعمل كتطبيق موبايل كامل وشاشة كاملة وسريع الاستجابة بدون الحاجة لدفع أي رسوم لمتاجر App Store أو Google Play!
        </p>

        {/* Steps for iOS / iPhone */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200 font-cairo">
            <span className="text-base">🍎</span>
            <span>لمستخدمي iPhone (متصفح Safari):</span>
          </div>
          <ol className="text-xs text-slate-500 dark:text-slate-400 font-tajawal space-y-1 list-decimal pr-4">
            <li>اضغط على زر المشاركة (Share) بأسفل متصفح Safari.</li>
            <li>اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).</li>
            <li>اضغط "إضافة" (Add) لتثبيت أيقونة الكنيسة على هاتفك.</li>
          </ol>
        </div>

        {/* Steps for Android */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200 font-cairo">
            <span className="text-base">🤖</span>
            <span>لمستخدمي Android (متصفح Google Chrome):</span>
          </div>
          <ol className="text-xs text-slate-500 dark:text-slate-400 font-tajawal space-y-1 list-decimal pr-4">
            <li>اضغط على قائمة الثلاث نقاط العلوية في Chrome.</li>
            <li>اختر "تثبيت التطبيق" (Install App).</li>
            <li>سيظهر التطبيق كأيقونة مستقلة وتعمل في وضع عدم الاتصال.</li>
          </ol>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20"
        >
          فهمت، شكراً
        </button>
      </div>
    </div>
  );
}
