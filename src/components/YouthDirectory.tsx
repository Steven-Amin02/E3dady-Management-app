'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { SchoolYear, Youth, YouthWithDetails } from '@/types/database';
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageCircle,
  Edit2,
  Trash2,
  UserPlus,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileText,
  User,
  Check,
} from 'lucide-react';
import { Portal } from '@/components/Portal';

export function YouthDirectory() {
  const {
    youth,
    servants,
    addYouth,
    updateYouth,
    deleteYouth,
    getYouthWithDetails,
    isAdmin,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<SchoolYear | 'all'>('all');
  const [selectedServantId, setSelectedServantId] = useState<string>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYouth, setEditingYouth] = useState<Youth | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    school_year: '1st Prep' as SchoolYear,
    assigned_servant_id: '',
    notes: '',
  });

  const openAddModal = () => {
    setEditingYouth(null);
    setFormData({
      name: '',
      phone: '',
      school_year: '1st Prep',
      assigned_servant_id: servants[0]?.id || '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Youth) => {
    setEditingYouth(item);
    setFormData({
      name: item.name,
      phone: item.phone,
      school_year: item.school_year,
      assigned_servant_id: item.assigned_servant_id || '',
      notes: item.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('يرجى كتابة الاسم ورقم الهاتف بالكامل');
      return;
    }

    if (editingYouth) {
      await updateYouth(editingYouth.id, {
        name: formData.name,
        phone: formData.phone,
        school_year: formData.school_year,
        assigned_servant_id: formData.assigned_servant_id || null,
        notes: formData.notes,
      });
    } else {
      await addYouth({
        name: formData.name,
        phone: formData.phone,
        school_year: formData.school_year,
        assigned_servant_id: formData.assigned_servant_id || null,
        notes: formData.notes,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteYouth(id);
    setDeleteConfirmId(null);
  };

  // Filtered Youth
  const filteredYouth = useMemo(() => {
    return youth
      .map(getYouthWithDetails)
      .filter((y) => {
        const matchesSearch =
          !searchQuery ||
          y.name.includes(searchQuery) ||
          y.phone.includes(searchQuery);
        const matchesYear = selectedYear === 'all' || y.school_year === selectedYear;
        const matchesServant =
          selectedServantId === 'all' || y.assigned_servant_id === selectedServantId;
        return matchesSearch && matchesYear && matchesServant;
      });
  }, [youth, searchQuery, selectedYear, selectedServantId, getYouthWithDetails]);

  // WhatsApp Link Helper
  const getWhatsAppLink = (phone: string, name: string) => {
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
    else if (!cleanPhone.startsWith('20')) cleanPhone = '20' + cleanPhone;
    const msg = `سلام ومحبة يا ${name} الغالي ❤️🕊️ حابب أطمن عليك وعلى دراستك ونشوفك دايماً بكل خير في الكنيسة!`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 font-cairo">
              دليل مخدومي إعدادي
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-bold font-cairo">
              {youth.length} مخدوم
            </span>
          </div>
          <p className="text-xs text-slate-500 font-tajawal mt-0.5">
            إدارة بيانات المخدومين وتوزيعهم الرعوي على الخدام السبعة
          </p>
        </div>

        {/* Add Youth Button */}
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20 active:scale-95 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة مخدوم جديد</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بالاسم أو الموبايل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* School Year Filter */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value as SchoolYear | 'all')}
              className="w-full px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">كل الفصول الدراسية</option>
              <option value="1st Prep">أولى إعدادي (1st Prep)</option>
              <option value="2nd Prep">ثانية إعدادي (2nd Prep)</option>
              <option value="3rd Prep">ثالثة إعدادي (3rd Prep)</option>
            </select>
          </div>

          {/* Assigned Servant Filter */}
          <div>
            <select
              value={selectedServantId}
              onChange={(e) => setSelectedServantId(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">تصفية بحسب الخادم الراعي (الكل)</option>
              {servants.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Youth Directory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredYouth.map((member) => {
          const servant = servants.find((s) => s.id === member.assigned_servant_id);

          return (
            <div
              key={member.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold flex items-center justify-center text-sm shadow-inner">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-cairo">
                        {member.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                          {member.school_year === '1st Prep'
                            ? 'أولى إعدادي'
                            : member.school_year === '2nd Prep'
                            ? 'ثانية إعدادي'
                            : 'ثالثة إعدادي'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono" dir="ltr">
                          {member.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(member)}
                      className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-sky-600 transition-colors"
                      title="تعديل البيانات"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(member.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition-colors"
                      title="حذف المخدوم"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Assigned Servant & Attendance Metric */}
                <div className="mt-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-tajawal">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                    <span>الخادم المسند:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {servant ? servant.name : 'غير محدد'}
                    </span>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                    حضور {member.attendance_rate}%
                  </span>
                </div>

                {/* Pastoral Notes */}
                {member.notes && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-tajawal line-clamp-2 px-1">
                    💬 {member.notes}
                  </p>
                )}
              </div>

              {/* Direct Communications Bottom Bar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 font-tajawal">
                  {member.present_sessions || 0} حضور من {member.total_sessions || 0} جمعة
                </span>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${member.phone.replace(/[^0-9+]/g, '')}`}
                    className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-transform active:scale-95"
                    title="اتصال هاتفي"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href={getWhatsAppLink(member.phone, member.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-transform active:scale-95 shadow-sm"
                    title="مراسلة واتساب"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-white stroke-none" />
                    <span>واتساب</span>
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Youth Modal */}
      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col my-auto max-h-[calc(100dvh-2rem)] overflow-hidden">
              <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-cairo">
                  {editingYouth ? 'تعديل بيانات المخدوم' : 'إضافة مخدوم جديد للخدمة'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-5 overflow-y-auto space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الاسم ثلاثي أو رباعي *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: كيرلس مينا فؤاد"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رقم الهاتف (للاتصال والواتساب) *
                    </label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      placeholder="012XXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-right font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        السنة الدراسية
                      </label>
                      <select
                        value={formData.school_year}
                        onChange={(e) =>
                          setFormData({ ...formData, school_year: e.target.value as SchoolYear })
                        }
                        className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      >
                        <option value="1st Prep">أولى إعدادي</option>
                        <option value="2nd Prep">ثانية إعدادي</option>
                        <option value="3rd Prep">ثالثة إعدادي</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        الخادم الراعي
                      </label>
                      <select
                        value={formData.assigned_servant_id}
                        onChange={(e) =>
                          setFormData({ ...formData, assigned_servant_id: e.target.value })
                        }
                        className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      >
                        <option value="">بدون تخصيص</option>
                        {servants.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ملاحظات رعوية وخاصة
                    </label>
                    <textarea
                      rows={3}
                      placeholder="ملاحظات المتابعة، الهوايات، الحالة الروحية أو الدراسية..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none font-tajawal resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 p-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20 active:scale-95"
                  >
                    {editingYouth ? 'حفظ التعديلات' : 'إضافة المخدوم'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-3 my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 mx-auto flex items-center justify-center text-xl">
                ⚠️
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-cairo">
                هل أنت متأكد من حذف هذا المخدوم؟
              </h4>
              <p className="text-xs text-slate-500 font-tajawal">
                سيتم حذف جميع سجلات الحضور الخاصة به أيضاً.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 active:scale-95 transition-all"
                >
                  تأكيد الحذف
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
