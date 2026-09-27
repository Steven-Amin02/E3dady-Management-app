'use client';

import { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Header } from '@/components/Header';
import { CrossIcon } from '@/components/CrossIcon';
import { BottomNav, TabType } from '@/components/BottomNav';
import { DailyFollowUp } from '@/components/DailyFollowUp';
import { WeeklyAttendance } from '@/components/WeeklyAttendance';
import { YouthDirectory } from '@/components/YouthDirectory';
import { ServiceScheduleView } from '@/components/ServiceScheduleView';
import { ServantsManager } from '@/components/ServantsManager';
import { NotificationModal } from '@/components/NotificationModal';
import { PwaGuideModal } from '@/components/PwaGuideModal';

function MainApp() {
  const { isLoading } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('followup');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPwaGuideOpen, setIsPwaGuideOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-5">
        {/* Spinning logo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-[28px] bg-gradient-to-tr from-sky-600 via-sky-500 to-amber-400 p-[2.5px] shadow-sky-glow animate-pulse-subtle">
            <div className="w-full h-full bg-slate-950 rounded-[26px] flex items-center justify-center text-sky-400">
              <CrossIcon className="w-9 h-9" />
            </div>
          </div>
          <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-sky-500 rounded-full border-2 border-slate-950 flex items-center justify-center animate-bounce">
            <span className="text-[10px]">🕊️</span>
          </span>
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-bold font-cairo text-white">
            خدمة إعدادي
          </p>
          <p className="text-xs text-sky-300 font-tajawal">
            جارِ تحميل البيانات...
          </p>
        </div>

        {/* Loading bar */}
        <div className="w-40 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col app-bg font-cairo selection:bg-sky-500 selection:text-white">
      {/* Sticky Top Header */}
      <Header
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenPwaGuide={() => setIsPwaGuideOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-3.5 sm:px-5 pt-4">
        <div key={activeTab} className="tab-content">
          {activeTab === 'followup' && (
            <DailyFollowUp
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              onNavigateAttendance={() => setActiveTab('attendance')}
            />
          )}
          {activeTab === 'attendance' && <WeeklyAttendance />}
          {activeTab === 'youth' && <YouthDirectory />}
          {activeTab === 'schedule' && <ServiceScheduleView />}
          {activeTab === 'servants' && <ServantsManager />}
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Modals */}
      <NotificationModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
      <PwaGuideModal
        isOpen={isPwaGuideOpen}
        onClose={() => setIsPwaGuideOpen(false)}
      />
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
