'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Servant, ServantRole } from '@/types/database';
import { CrossIcon } from '@/components/CrossIcon';
import {
  UserPlus,
  Phone,
  MessageCircle,
  Edit2,
  Trash2,
  Users,
  Info,
  LogIn,
  CheckCircle,
} from 'lucide-react';
import { Portal } from '@/components/Portal';
import { formatEgyptianPhoneForWhatsApp } from '@/lib/utils';

export function ServantsManager() {
  const {
    servants,
    youth,
    currentServant,
    isAdmin,
    addServant,
    updateServant,
    deleteServant,
    loginServant,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServant, setEditingServant] = useState<Servant | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ name: string; phone: string; role: ServantRole }>({
    name: '', phone: '', role: 'servant',
  });

  const openAddModal = () => {
    setEditingServant(null);
    setFormData({ name: '', phone: '', role: 'servant' });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Servant) => {
    setEditingServant(item);
    setFormData({ name: item.name, phone: item.phone, role: item.role });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('يرجى كتابة الاسم ورقم الهاتف');
      return;
    }
    if (editingServant) {
      await updateServant(editingServant.id, formData);
    } else {
      await addServant(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (servants.length <= 1) {
      alert('لا يمكن حذف آخر خادم بالخدمة');
      return;
    }
    await deleteServant(id);
    setDeleteId(null);
  };

  const getWhatsAppLink = (phone: string, name: string) => {
    const clean = formatEgyptianPhoneForWhatsApp(phone);
    const msg = `مساء الخير يا ${name} الغالي 🕊️✨ تواصل خاص بخدمة إعدادي`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-4 pb-24 animate-fade-in">

      {/* ── Page Header ──────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500" />
        <div className="p-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-cairo">
                هيئة خدام إعدادي
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-800/40">
                {servants.length} خادم
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-tajawal mt-0.5">
              إدارة الحسابات والصلاحيات ومتابعة المخدومين المسندين
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/25 active:scale-95 shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>إضافة خادم</span>
            </button>
          )}
        </div>
      </div>

      {/* Non-admin notice */}
      {!isAdmin && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200 font-tajawal">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            أنت مسجل بحساب خادم عادي. للوصول لصلاحيات الإدارة، بدّل للحساب الإداري من القائمة العلوية.
          </span>
        </div>
      )}

      {/* ── Servants Grid ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {servants.map((servant) => {
          const isCurrentUser = servant.id === currentServant?.id;
          const assignedCount = youth.filter((y) => y.assigned_servant_id === servant.id).length;
          const isAdminRole = servant.role === 'admin';

          return (
            <div
              key={servant.id}
              className={`relative rounded-3xl border transition-all duration-200 overflow-hidden ${isCurrentUser
                  ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/60 shadow-card'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-card hover:-translate-y-0.5'
                }`}
            >
              {/* Role stripe */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${isAdminRole ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-sky-400 to-indigo-400'
                }`} />

              <div className="p-4">
                {/* Top row: avatar + name + actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-base shrink-0 ${isAdminRole
                        ? 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/40 text-amber-600'
                        : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sky-600 dark:text-sky-400'
                      }`}>
                      {isAdminRole ? '👑' : <CrossIcon className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-cairo">
                          {servant.name}
                        </h4>
                        {isCurrentUser && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-600 text-white font-bold">
                            أنت
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${isAdminRole
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                          {isAdminRole ? 'أمين الخدمة' : 'خادم'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                          {servant.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin edit/delete actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(servant)}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-sky-500 transition-colors"
                        title="تعديل"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(servant.id)}
                        className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Assigned count */}
                <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-tajawal">
                    <Users className="w-3.5 h-3.5 text-sky-500" />
                    <span>المخدومون المسندون</span>
                  </div>
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-cairo">
                    {assignedCount}
                  </span>
                </div>

                {/* Footer actions */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {!isCurrentUser ? (
                    <button
                      onClick={() => loginServant(servant.id)}
                      className="flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline font-tajawal"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      تبديل للحساب
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold font-tajawal">
                      <CheckCircle className="w-3.5 h-3.5" />
                      الحساب النشط
                    </span>
                  )}

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${servant.phone.replace(/[^0-9+]/g, '')}`}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      title="اتصال"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={getWhatsAppLink(servant.phone, servant.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm shadow-emerald-600/20"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-white stroke-none" />
                      <span>واتساب</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add/Edit Modal ────────────────────────── */}
      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col my-auto max-h-[calc(100dvh-2rem)] overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-indigo-500 to-sky-500 shrink-0" />

              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-cairo">
                  {editingServant ? 'تعديل بيانات الخادم' : 'إضافة خادم جديد'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-5 overflow-y-auto space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      الاسم الكامل *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: م/ مارك عادل"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      رقم الهاتف *
                    </label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      placeholder="012XXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      الدور والصلاحية
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as ServantRole })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="servant">خادم — تسجيل حضور وافتقاد</option>
                      <option value="admin">أمين خدمة — إدارة كاملة</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 p-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-sm shadow-indigo-600/25 active:scale-95"
                  >
                    {editingServant ? 'حفظ التعديلات' : 'إضافة الخادم'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* ── Delete Confirm Modal ──────────────────── */}
      {deleteId && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-3 my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-2xl">
                🗑️
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-cairo">
                حذف هذا الخادم؟
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-tajawal leading-relaxed">
                المخدومون المسندون له سيصبحون غير محددين حتى يتم إعادة توزيعهم.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteId)}
                  className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-sm shadow-rose-600/25 active:scale-95"
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
