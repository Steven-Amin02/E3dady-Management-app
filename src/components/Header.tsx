'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CrossIcon } from '@/components/CrossIcon';
import {
  Bell,
  ShieldCheck,
  ChevronDown,
  Smartphone,
  Check,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface HeaderProps {
  onOpenNotifications: () => void;
  onOpenPwaGuide: () => void;
}

export function Header({ onOpenNotifications, onOpenPwaGuide }: HeaderProps) {
  const { currentServant, servants, loginServant, isAdmin, isSupabase } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xs transition-colors">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

        {/* ── Brand ── */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo with vector cross */}
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-600 flex items-center justify-center shadow-sky-glow text-white">
              <CrossIcon className="w-5 h-5 text-white drop-shadow-xs" />
            </div>
            {/* Live status dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                isSupabase ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
              }`}
            />
          </div>

          {/* Title block */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-slate-900 dark:text-white font-cairo leading-tight truncate">
                خدمة إعدادي
              </h1>
              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold border border-sky-400/20 tracking-wide">
                PWA
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-tajawal leading-tight truncate">
              اجتماع اعدادي كنيسة الاخوة بشبرا الخيمة
            </p>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Supabase status — visible on sm+ */}
          <button
            onClick={() => alert(
              isSupabase
                ? '✅ متصل بقاعدة بيانات Supabase السحابية.'
                : '💡 وضع تجريبي — أضف متغيرات .env.local للاتصال السحابي.'
            )}
            title={isSupabase ? 'متصل بـ Supabase' : 'الوضع التجريبي'}
            className={`hidden sm:flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-xl transition-colors ${
              isSupabase
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40'
            }`}
          >
            {isSupabase
              ? <Wifi className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              : <WifiOff className="w-3 h-3 text-amber-500 dark:text-amber-400" />}
            <span>{isSupabase ? 'متصل' : 'تجريبي'}</span>
          </button>

          {/* PWA install */}
          <button
            onClick={onOpenPwaGuide}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-400 border border-slate-200/80 dark:border-slate-700/60 transition-all hover:scale-105 active:scale-95 shadow-2xs"
            title="تثبيت التطبيق (PWA)"
            aria-label="تثبيت التطبيق"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-600 dark:text-amber-400 border border-slate-200/80 dark:border-slate-700/60 transition-all hover:scale-105 active:scale-95 shadow-2xs"
            title="الإشعارات"
            aria-label="الإشعارات"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse ring-2 ring-white dark:ring-slate-800" />
          </button>

          {/* Servant Switcher */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 p-1 pl-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/60 transition-all shadow-2xs"
            >
              {/* Avatar */}
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-xs shrink-0">
                {currentServant?.name?.charAt(0) || 'خ'}
              </div>

              {/* Name — visible on sm+ */}
              <div className="hidden sm:block text-right leading-tight">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[85px]">
                    {currentServant?.name ? currentServant.name.split(' ')[0] : 'حساب الخادم'}
                  </span>
                  {isAdmin && <ShieldCheck className="w-3 h-3 text-amber-500 shrink-0" />}
                </div>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 block font-tajawal">
                  {isAdmin ? 'أمين الخدمة' : 'خادم'}
                </span>
              </div>

              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-card-lg py-2 z-40 animate-slide-down overflow-hidden text-slate-800 dark:text-slate-200">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-tajawal">تبديل حساب الخادم</p>
                    <p className="text-xs font-bold text-sky-600 dark:text-sky-400 mt-0.5">{servants.length} خادم مسجل</p>
                  </div>

                  <div className="max-h-56 overflow-y-auto py-1">
                    {servants.map((servant) => {
                      const isSelected = servant.id === currentServant?.id;
                      return (
                        <button
                          key={servant.id}
                          onClick={() => { loginServant(servant.id); setDropdownOpen(false); }}
                          className={`w-full px-3 py-2 flex items-center gap-2.5 text-right text-xs transition-colors ${
                            isSelected
                              ? 'bg-sky-50 dark:bg-sky-600/15 text-sky-600 dark:text-sky-300 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                            servant.role === 'admin'
                              ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {servant.role === 'admin' ? '👑' : <CrossIcon className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold truncate">{servant.name}</span>
                              {servant.role === 'admin' && (
                                <span className="text-[9px] px-1 rounded bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-500/20 shrink-0">
                                  أمين
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {servant.phone}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
