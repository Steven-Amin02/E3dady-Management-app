'use client';

import { useState } from 'react';
import { Attendance } from '@/types/database';
import { calculateMemberSparkline, MemberSparklineMetrics, SparklineSession } from '@/lib/pastoralAnalytics';
import { Check, X, HelpCircle, Minus } from 'lucide-react';

interface MemberSparklineProps {
  youthId: string;
  attendance: Attendance[];
  windowSize?: number;
  referenceDateStr?: string;
  showConsistencyBadge?: boolean;
  showStreakBadge?: boolean;
  compact?: boolean;
  className?: string;
}

export function MemberSparkline({
  youthId,
  attendance,
  windowSize = 12,
  referenceDateStr,
  showConsistencyBadge = true,
  showStreakBadge = true,
  compact = false,
  className = '',
}: MemberSparklineProps) {
  const [activeSession, setActiveSession] = useState<SparklineSession | null>(null);

  const metrics: MemberSparklineMetrics = calculateMemberSparkline(
    youthId,
    attendance,
    windowSize,
    referenceDateStr
  );

  const getStatusColor = (status: SparklineSession['status']) => {
    switch (status) {
      case 'present':
        return 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600 hover:ring-2 hover:ring-emerald-400/40';
      case 'absent':
        return 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 dark:border-rose-400 text-rose-600 hover:bg-rose-100 hover:ring-2 hover:ring-rose-400/40';
      case 'excused':
        return 'bg-amber-400 dark:bg-amber-500 text-amber-950 hover:bg-amber-500 hover:ring-2 hover:ring-amber-400/40';
      case 'unrecorded':
      default:
        return 'bg-slate-200 dark:bg-slate-700/60 text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600';
    }
  };

  const getStatusIcon = (status: SparklineSession['status']) => {
    if (compact) return null;
    switch (status) {
      case 'present':
        return <Check className="w-2.5 h-2.5 stroke-[3]" />;
      case 'absent':
        return <X className="w-2.5 h-2.5 stroke-[3] text-rose-500 dark:text-rose-400" />;
      case 'excused':
        return <HelpCircle className="w-2.5 h-2.5 stroke-[2.5]" />;
      default:
        return <Minus className="w-2 h-2" />;
    }
  };

  const getStatusLabelArabic = (status: SparklineSession['status']) => {
    switch (status) {
      case 'present': return 'حاضر ✅';
      case 'absent': return 'غائب ❌';
      case 'excused': return 'معتذر 📋';
      default: return 'غير مسجل ⚪';
    }
  };

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`}>
      {/* ── Active Hover / Tap Tooltip Popover ── */}
      {activeSession && (
        <div className="absolute -top-11 right-0 z-30 bg-slate-900 text-white text-[11px] font-tajawal px-2.5 py-1 rounded-xl shadow-xl flex items-center gap-2 pointer-events-none animate-fade-in border border-slate-700">
          <span className="font-mono font-bold text-sky-300">{activeSession.date}</span>
          <span className="text-slate-400">•</span>
          <span className="font-bold">{getStatusLabelArabic(activeSession.status)}</span>
        </div>
      )}

      {/* ── Sparkline Strip & Metrics Row ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 12 Micro-blocks */}
        <div
          className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60"
          dir="ltr"
        >
          {metrics.sessions.map((sess, idx) => {
            const isLatest = idx === metrics.sessions.length - 1;
            return (
              <div
                key={sess.date + idx}
                onMouseEnter={() => setActiveSession(sess)}
                onMouseLeave={() => setActiveSession(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSession(activeSession?.date === sess.date ? null : sess);
                }}
                title={`${sess.dayMonth}: ${getStatusLabelArabic(sess.status)}`}
                className={`relative cursor-pointer transition-all duration-150 rounded-[5px] flex items-center justify-center select-none ${
                  compact ? 'w-3.5 h-3.5' : 'w-4 h-4 sm:w-4.5 sm:h-4.5'
                } ${getStatusColor(sess.status)} ${
                  isLatest ? 'ring-1 ring-sky-500 ring-offset-1 dark:ring-offset-slate-900' : ''
                }`}
              >
                {getStatusIcon(sess.status)}
              </div>
            );
          })}
        </div>

        {/* Consistency Ratio Badge (e.g. "10/12") */}
        {showConsistencyBadge && (
          <div
            className={`inline-flex items-center gap-1 font-mono font-bold rounded-lg border ${
              compact ? 'px-1.5 py-0.2 text-[10px]' : 'px-2 py-0.5 text-xs'
            } ${
              metrics.attendanceRate >= 75
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : metrics.attendanceRate >= 50
                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}
            title={`نسبة الحضور خلال آخر ١٢ أسبوع: ${metrics.attendanceRate}% (${metrics.attendedCount} من ${metrics.totalWindow} لقاء)`}
          >
            <span>{metrics.consistencyFraction}</span>
            <span className="text-[9px] opacity-75 font-tajawal">لقاء</span>
          </div>
        )}

        {/* Personal Streak Badge */}
        {showStreakBadge && metrics.streakCount >= 2 && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold font-cairo border ${
              metrics.streakType === 'present'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : metrics.streakType === 'absent'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}
          >
            {metrics.streakLabel}
          </span>
        )}
      </div>
    </div>
  );
}
