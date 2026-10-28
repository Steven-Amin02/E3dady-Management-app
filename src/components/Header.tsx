'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CrossIcon } from '@/components/CrossIcon';
import { Bell, LogOut, Smartphone, MoreHorizontal, CalendarDays, ShieldCheck } from 'lucide-react';
import { errorMessage } from '@/lib/outbox';
interface HeaderProps { onOpenNotifications: () => void; onOpenPwaGuide: () => void; onNavigate: (tab: 'schedule' | 'servants') => void }
export function Header({ onOpenNotifications, onOpenPwaGuide, onNavigate }: HeaderProps) {
  const { currentServant, status, isAdmin, signOut } = useApp(s => ({ currentServant: s.currentServant, status: s.status, isAdmin: s.isAdmin, signOut: s.signOut }));
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="sticky top-0 z-40 border-b border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700">
    <div className="max-w-2xl mx-auto px-4 min-h-16 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <CrossIcon className="w-8 h-8 text-sky-600" />
        <div><h1 className="text-sm font-bold">خدمة إعدادي</h1><p className="text-xs text-slate-500">{currentServant?.name} · {status === 'online' ? 'متصل' : 'غير متزامن'}</p></div>
      </div>
      <div className="relative flex gap-1">
        <button className="rounded-xl p-2" aria-label="المزيد" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><MoreHorizontal className="w-5 h-5" /></button>
        {menuOpen && <div className="absolute left-0 top-12 z-50 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <button className="flex w-full items-center gap-2 rounded-xl p-3 text-right text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); onOpenNotifications(); }}><Bell className="w-4 h-4" />اختبار الإشعارات</button>
          <button className="flex w-full items-center gap-2 rounded-xl p-3 text-right text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); onOpenPwaGuide(); }}><Smartphone className="w-4 h-4" />تثبيت التطبيق</button>
          <button className="flex w-full items-center gap-2 rounded-xl p-3 text-right text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); onNavigate('schedule'); }}><CalendarDays className="w-4 h-4" />جدول الخدمة</button>
          {isAdmin && <button className="flex w-full items-center gap-2 rounded-xl p-3 text-right text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setMenuOpen(false); onNavigate('servants'); }}><ShieldCheck className="w-4 h-4" />إدارة الخدام</button>}
          <button className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-slate-200 p-3 pt-3 text-right text-sm text-red-700 hover:bg-red-50 dark:border-slate-700 dark:text-red-300 dark:hover:bg-red-950/30" onClick={() => void signOut().catch(e => setError(errorMessage(e)))}><LogOut className="w-4 h-4" />تسجيل الخروج</button>
        </div>}
      </div>
    </div>
    {error && <p role="alert" className="px-4 pb-2 text-sm text-red-600">{error}<button className="mr-2 underline" onClick={() => setError('')}>إغلاق</button></p>}
  </header>;
}
