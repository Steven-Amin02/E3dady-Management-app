'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Attendance } from '@/types/database';
import {
  generateAcademicFridays,
  getFridayTurnoutStats,
  FridaySessionInfo,
  LifecycleState
} from '@/lib/fridayCalendar';
import {
  Calendar,
  ChevronRight,
  ChevronLeft,
  Lock,
  Zap,
  Clock,
  Sparkles,
  BookOpen,
  Cross
} from 'lucide-react';

interface FridayCalendarRibbonProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  attendance: Attendance[];
  totalYouthCount: number;
  lastFridayDate: string;
  nextFridayDate: string;
}

export function FridayCalendarRibbon({
  selectedDate,
  onSelectDate,
  attendance,
  totalYouthCount,
  lastFridayDate,
  nextFridayDate,
}: FridayCalendarRibbonProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedTerm, setSelectedTerm] = useState<'all' | 'fall' | 'lent' | 'summer'>('all');

  // Generate the 36-40 academic Fridays
  const allFridays = useMemo(() => generateAcademicFridays(), []);

  // Filtered by selected Trimester
  const visibleFridays = useMemo(() => {
    if (selectedTerm === 'all') return allFridays;
    return allFridays.filter((f) => f.term === selectedTerm);
  }, [allFridays, selectedTerm]);

  // Auto-scroll to selected Friday node on mount or selection
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const activeEl = scrollContainerRef.current.querySelector<HTMLElement>(`[data-date="${selectedDate}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedDate, selectedTerm]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const amount = direction === 'left' ? -260 : 260;
    scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card p-3 sm:p-4 space-y-3 overflow-hidden">
      {/* ── TOP BAR: Trimester Jump Tabs & Anchor Strip ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Trimester Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl overflow-x-auto text-xs font-cairo">
          <button
            type="button"
            onClick={() => setSelectedTerm('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedTerm === 'all'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            كل العام
          </button>
          <button
            type="button"
            onClick={() => setSelectedTerm('fall')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedTerm === 'fall'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            الخريف والدراسة
          </button>
          <button
            type="button"
            onClick={() => setSelectedTerm('lent')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedTerm === 'lent'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            نصف العام والصوم
          </button>
          <button
            type="button"
            onClick={() => setSelectedTerm('summer')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedTerm === 'summer'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            الصيف والنشاط
          </button>
        </div>

        {/* Scroll Controls (Desktop / Tablet) */}
        <div className="hidden sm:flex items-center gap-1 text-slate-400">
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="تمرير لليمين"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="تمرير لليسار"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── THE HORIZONTAL FRIDAY RIBBON ── */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scroll-smooth no-scrollbar"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {visibleFridays.map((fSession) => {
          const isSelected = selectedDate === fSession.date;
          const stats = getFridayTurnoutStats(attendance, totalYouthCount, fSession.date);

          // Card Health Styling
          let healthBadgeStyle = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
          let borderHealth = 'border-slate-200 dark:border-slate-800';

          if (stats.isRecorded) {
            if (stats.health === 'emerald') {
              healthBadgeStyle = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300';
              borderHealth = isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-emerald-200 dark:border-emerald-900/60';
            } else if (stats.health === 'indigo') {
              healthBadgeStyle = 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300';
              borderHealth = isSelected ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-sky-200 dark:border-sky-900/60';
            } else {
              healthBadgeStyle = 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300';
              borderHealth = isSelected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-amber-200 dark:border-amber-900/60';
            }
          }

          return (
            <button
              key={fSession.date}
              data-date={fSession.date}
              type="button"
              onClick={() => onSelectDate(fSession.date)}
              style={{ scrollSnapAlign: 'center' }}
              className={`relative shrink-0 w-[130px] sm:w-[145px] p-3 rounded-2xl border text-right transition-all duration-200 active:scale-95 flex flex-col justify-between gap-2 ${borderHealth} ${
                isSelected
                  ? 'bg-gradient-to-b from-sky-50/90 to-white dark:from-sky-950/40 dark:to-slate-900 shadow-md ring-2 ring-sky-500'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
            >
              {/* Top date and lifecycle pill */}
              <div className="flex items-start justify-between gap-1 w-full">
                <div>
                  <div className="text-[10px] text-slate-400 font-tajawal font-medium">
                    {fSession.displayMonth}
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono leading-none pt-0.5">
                    {fSession.displayDay}
                  </div>
                </div>

                {/* Lifecycle Indicator */}
                {fSession.lifecycleState === 'locked' && (
                  <span className="p-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500" title="سجل مؤرشف ومقفل">
                    <Lock className="w-3 h-3" />
                  </span>
                )}
                {fSession.lifecycleState === 'live' && (
                  <span className="px-1.5 py-0.5 rounded-md bg-sky-500 text-white text-[9px] font-bold animate-pulse font-cairo flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5 fill-white" />
                    <span>الليلة</span>
                  </span>
                )}
                {fSession.lifecycleState === 'grace' && (
                  <span className="p-1 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" title="فترة مراجعة الأعذار">
                    <Clock className="w-3 h-3" />
                  </span>
                )}
              </div>

              {/* Liturgical or Event Marker */}
              <div className="w-full">
                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-tajawal line-clamp-1 block leading-tight">
                  {fSession.liturgicalTag}
                </span>
              </div>

              {/* Attendance percentage indicator */}
              <div className="w-full pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                {stats.isRecorded ? (
                  <>
                    <span className="text-[10px] font-bold font-mono text-slate-700 dark:text-slate-300">
                      {stats.presentCount}/{totalYouthCount}
                    </span>
                    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-md ${healthBadgeStyle}`}>
                      {stats.percentage}%
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-400 font-tajawal">
                    {fSession.lifecycleState === 'upcoming' ? 'مجدول' : 'قيد التسجيل'}
                  </span>
                )}
              </div>

              {/* Active selection dot */}
              {isSelected && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-sky-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── PERSISTENT ANCHOR STRIP ── */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs font-cairo">
        <span className="text-[11px] text-slate-400 font-tajawal">روابط سريعة:</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelectDate(lastFridayDate)}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              selectedDate === lastFridayDate
                ? 'bg-sky-600 text-white font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            الجمعة الماضية
          </button>
          <button
            type="button"
            onClick={() => onSelectDate(nextFridayDate)}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              selectedDate === nextFridayDate
                ? 'bg-sky-600 text-white font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            الجمعة القادمة
          </button>
        </div>
      </div>
    </div>
  );
}
