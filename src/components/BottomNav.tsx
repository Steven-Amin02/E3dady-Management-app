'use client';

import { useApp } from '@/context/AppContext';
import {
  HeartHandshake,
  CalendarCheck,
  Users,
  CalendarDays,
  ShieldCheck,
  Check
} from 'lucide-react';

export type TabType = 'followup' | 'attendance' | 'youth' | 'schedule' | 'servants';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  const { dailyFollowUpYouth } = useApp();

  const isTodayFollowUpDone = dailyFollowUpYouth?.alreadyContactedToday;
  const hasPendingFollowUp = dailyFollowUpYouth && !isTodayFollowUpDone;

  const navItems = [
    {
      id: 'followup' as TabType,
      label: 'الافتقاد',
      icon: HeartHandshake,
      badge: isTodayFollowUpDone ? 'done' : hasPendingFollowUp ? 1 : null,
    },
    {
      id: 'attendance' as TabType,
      label: 'الحضور',
      icon: CalendarCheck,
    },
    {
      id: 'youth' as TabType,
      label: 'المخدومين',
      icon: Users,
    },
    {
      id: 'schedule' as TabType,
      label: 'الجدول',
      icon: CalendarDays,
    },
    {
      id: 'servants' as TabType,
      label: 'الخدام',
      icon: ShieldCheck,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      {/* Frosted glass bar */}
      <div className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-nav">
        <div className="max-w-2xl mx-auto px-1 pt-1.5 pb-1 flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className="relative flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all duration-200 min-w-[52px] group"
              >
                {/* Active pill background */}
                {isActive && (
                  <span className="absolute inset-0 rounded-2xl bg-sky-50 dark:bg-sky-950/60 animate-zoom-in" />
                )}

                {/* Icon + badge wrapper */}
                <div className="relative z-10">
                  <Icon
                    className={`w-[22px] h-[22px] transition-all duration-200 ${
                      isActive
                        ? 'text-sky-600 dark:text-sky-400 stroke-[2.5px]'
                        : 'text-slate-400 dark:text-slate-500 stroke-2 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    }`}
                  />

                  {/* Badge */}
                  {item.badge === 'done' && (
                    <span className="absolute -top-1.5 -right-2 w-[17px] h-[17px] rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 animate-bounce-in">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                  {typeof item.badge === 'number' && (
                    <span className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 animate-bounce-in">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] font-bold tracking-tight z-10 transition-colors duration-200 font-tajawal ${
                    isActive
                      ? 'text-sky-600 dark:text-sky-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {item.label}
                </span>

                {/* Active dot indicator */}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-sky-500 dark:bg-sky-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
