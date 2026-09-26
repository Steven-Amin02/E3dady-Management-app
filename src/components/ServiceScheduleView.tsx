'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatDateArabic } from '@/lib/utils';
import { ServiceSchedule } from '@/types/database';
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  User,
  BookOpen,
  FileText,
  Clock,
  CheckCircle,
  ShieldAlert,
} from 'lucide-react';

export function ServiceScheduleView() {
  const {
    schedules,
    servants,
    isAdmin,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    nextFridayDate,
    lastFridayDate,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ServiceSchedule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: nextFridayDate,
    speaker_servant_id: servants[0]?.id || '',
    lesson_title: '',
    activity_notes: '',
  });

  const openAddModal = () => {
    setEditingSchedule(null);
    setFormData({
      date: nextFridayDate,
      speaker_servant_id: servants[0]?.id || '',
      lesson_title: '',
      activity_notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: ServiceSchedule) => {
    setEditingSchedule(item);
    setFormData({
      date: item.date,
      speaker_servant_id: item.speaker_servant_id || '',
      lesson_title: item.lesson_title,
      activity_notes: item.activity_notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lesson_title.trim() || !formData.date) {
      alert('يرجى تحديد التاريخ وعنوان الموضوع');
      return;
    }

    if (editingSchedule) {
      await updateSchedule(editingSchedule.id, {
        date: formData.date,
        speaker_servant_id: formData.speaker_servant_id || null,
        lesson_title: formData.lesson_title,
        activity_notes: formData.activity_notes,
      });
    } else {
      await addSchedule({
        date: formData.date,
        speaker_servant_id: formData.speaker_servant_id || null,
        lesson_title: formData.lesson_title,
        activity_notes: formData.activity_notes,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteSchedule(id);
    setDeleteId(null);
  };

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 font-cairo">
              جدول الخدمة السنوي
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold font-cairo">
              {schedules.length} موضوع
            </span>
          </div>
          <p className="text-xs text-slate-500 font-tajawal mt-0.5">
            توزيع موضوعات الاجتماع الأسبوعية والمتكلم والأنشطة الروحية
          </p>
        </div>

        {/* Admin Add Schedule Button */}
        {isAdmin ? (
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موضوع جديد بالجدول</span>
          </button>
        ) : (
          <div className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-sky-500" />
            <span>عرض فقط (التعديل متاح لأمين الخدمة)</span>
          </div>
        )}
      </div>

      {/* Rota List */}
      <div className="space-y-3">
        {schedules.map((item, index) => {
          const speaker = servants.find((s) => s.id === item.speaker_servant_id);
          const isNext = item.date === nextFridayDate || item.date >= nextFridayDate && (index === 0 || schedules[index - 1]?.date < nextFridayDate);

          return (
            <div
              key={item.id}
              className={`p-4 rounded-3xl border transition-all duration-200 relative ${
                isNext
                  ? 'bg-gradient-to-r from-amber-50/70 to-sky-50/70 dark:from-amber-950/20 dark:to-sky-950/20 border-amber-300 dark:border-amber-700/60 shadow-md ring-1 ring-amber-400/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm'
              }`}
            >
              {/* Upcoming Badge */}
              {isNext && (
                <div className="absolute -top-2.5 right-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black shadow-md flex items-center gap-1 font-cairo">
                  <Sparkles className="w-3 h-3" />
                  <span>الاجتماع القادم</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  {/* Date & Week */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-950 px-2.5 py-0.5 rounded-lg border border-sky-200/50 dark:border-sky-800/40">
                      {formatDateArabic(item.date)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                      {item.date}
                    </span>
                  </div>

                  {/* Title / Topic */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-cairo flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{item.lesson_title}</span>
                  </h3>

                  {/* Speaker Servant */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-tajawal">
                    <span className="text-slate-400">الخادم المتكلم:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {speaker ? speaker.name : 'غير محدد بعد'}
                    </span>
                  </div>

                  {/* Activity & Hymn notes */}
                  {item.activity_notes && (
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-tajawal bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        النشاط / الفقرات:{' '}
                      </span>
                      {item.activity_notes}
                    </div>
                  )}
                </div>

                {/* Admin controls */}
                {isAdmin && (
                  <div className="flex items-center gap-1 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 rounded-xl text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
                      title="تعديل هذا الموضوع"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                      title="حذف هذا الموضوع"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit Schedule */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-cairo">
                {editingSchedule ? 'تعديل موعد الاجتماع' : 'إضافة موعد جديد لجدول الخدمة'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ الجمعة *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان الموضوع / الدرس الروحي *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: كيف أختار صديقي الحقيقي؟"
                  value={formData.lesson_title}
                  onChange={(e) => setFormData({ ...formData, lesson_title: e.target.value })}
                  className="w-full px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الخادم المتكلم
                </label>
                <select
                  value={formData.speaker_servant_id}
                  onChange={(e) => setFormData({ ...formData, speaker_servant_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">غير محدد</option>
                  {servants.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  فقرات إضافية / مسابقات / ألعاب
                </label>
                <textarea
                  rows={3}
                  placeholder="ورشة عمل، تدريب ترنيمة جديدة، دوري كرة..."
                  value={formData.activity_notes}
                  onChange={(e) => setFormData({ ...formData, activity_notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-500 font-tajawal"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20"
                >
                  {editingSchedule ? 'حفظ التعديلات' : 'إضافة للجدول'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-cairo">
              حذف هذا الاجتماع من الجدول؟
            </h4>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 rounded-2xl bg-rose-600 text-white text-xs font-bold shadow-md"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
