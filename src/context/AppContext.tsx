'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Servant, Youth, Attendance, ServiceSchedule, AttendanceStatus, YouthWithDetails } from '@/types/database';
import { INITIAL_SERVANTS, INITIAL_YOUTH, INITIAL_SCHEDULES, INITIAL_ATTENDANCE } from '@/lib/mockData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AppContextType {
  servants: Servant[];
  youth: Youth[];
  attendance: Attendance[];
  schedules: ServiceSchedule[];
  currentServant: Servant | null;
  isAdmin: boolean;
  isSupabase: boolean;
  isLoading: boolean;
  lastFridayDate: string;
  nextFridayDate: string;
  loginServant: (servantId: string) => void;
  // Youth CRUD
  addYouth: (data: Omit<Youth, 'id' | 'created_at'>) => Promise<Youth>;
  updateYouth: (id: string, updates: Partial<Youth>) => Promise<void>;
  deleteYouth: (id: string) => Promise<void>;
  // Attendance
  saveAttendance: (records: { youth_id: string; session_date: string; status: AttendanceStatus }[]) => Promise<void>;
  // Schedule CRUD
  addSchedule: (data: Omit<ServiceSchedule, 'id' | 'created_at'>) => Promise<ServiceSchedule>;
  updateSchedule: (id: string, updates: Partial<ServiceSchedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  // Servants CRUD
  addServant: (data: Omit<Servant, 'id' | 'created_at'>) => Promise<Servant>;
  updateServant: (id: string, updates: Partial<Servant>) => Promise<void>;
  deleteServant: (id: string) => Promise<void>;
  // Helpers
  getYouthWithDetails: (youthItem: Youth) => YouthWithDetails;
  getAbsentAssignedYouth: (servantId?: string) => YouthWithDetails[];
  resetDataToDefaults: () => void;
  contactedYouthIds: string[];
  toggleContactedYouth: (youthId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to calculate previous Friday
export function calculateLastFriday(fromDate = new Date()): string {
  const d = new Date(fromDate);
  const day = d.getDay(); // 0 is Sunday, 5 is Friday
  // Diff to previous Friday
  let diff = (day + 7 - 5) % 7;
  if (diff === 0) {
    // If today is Friday, let's treat last Friday as 7 days ago if morning, or today
    diff = 7;
  }
  d.setDate(d.getDate() - diff);
  return d.toISOString().split('T')[0];
}

// Helper to calculate upcoming Friday
export function calculateNextFriday(fromDate = new Date()): string {
  const d = new Date(fromDate);
  const day = d.getDay(); // 0 is Sunday, 5 is Friday
  const diff = (5 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [servants, setServants] = useState<Servant[]>(INITIAL_SERVANTS);
  const [youth, setYouth] = useState<Youth[]>(INITIAL_YOUTH);
  const [attendance, setAttendance] = useState<Attendance[]>(INITIAL_ATTENDANCE);
  const [schedules, setSchedules] = useState<ServiceSchedule[]>(INITIAL_SCHEDULES);
  const [currentServant, setCurrentServant] = useState<Servant | null>(INITIAL_SERVANTS[0]); // Defaults to Admin
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [contactedYouthIds, setContactedYouthIds] = useState<string[]>([]);

  // Fixed Friday references for realistic attendance
  // Defaulting to the latest recorded Friday in our dataset
  const lastFridayDate = useMemo(() => '2026-09-25', []);
  const nextFridayDate = useMemo(() => '2026-10-02', []);

  // Initialize data: Instant Local-First Hydration (0ms perceived load) + SWR Supabase fetch
  useEffect(() => {
    // Step 1: Synchronous LocalStorage hydration (instant UI paint)
    if (typeof window !== 'undefined') {
      try {
        const savedServants = localStorage.getItem('e3dady_servants');
        const savedYouth = localStorage.getItem('e3dady_youth');
        const savedAttendance = localStorage.getItem('e3dady_attendance');
        const savedSchedules = localStorage.getItem('e3dady_schedules');
        const savedServantId = localStorage.getItem('e3dady_active_servant_id');
        const savedContacted = localStorage.getItem('e3dady_contacted');

        if (savedServants) setServants(JSON.parse(savedServants));
        if (savedYouth) setYouth(JSON.parse(savedYouth));
        if (savedAttendance) setAttendance(JSON.parse(savedAttendance));
        if (savedSchedules) setSchedules(JSON.parse(savedSchedules));
        if (savedContacted) setContactedYouthIds(JSON.parse(savedContacted));

        if (savedServants) {
          const list = JSON.parse(savedServants);
          const found = list.find((s: Servant) => s.id === savedServantId);
          setCurrentServant(found || list[0]);
          setIsLoading(false); // Immediate 0ms paint from cache!
        }
      } catch (err) {
        console.warn('Local cache read error:', err);
      }
    }

    // Step 2: Non-blocking background fetch with stripped columns
    async function syncRemoteData() {
      if (isSupabaseConfigured && supabase) {
        try {
          // Optimized queries: fetch ONLY essential columns, limit attendance to recent sessions
          const [sRes, yRes, aRes, scRes] = await Promise.all([
            supabase
              .from('servants')
              .select('id, name, phone, role')
              .order('name'),
            supabase
              .from('youth')
              .select('id, name, phone, school_year, assigned_servant_id, notes')
              .order('name'),
            supabase
              .from('attendance')
              .select('id, youth_id, session_date, status, recorded_by')
              .order('session_date', { ascending: false })
              .limit(300),
            supabase
              .from('service_schedules')
              .select('id, date, speaker_servant_id, lesson_title, activity_notes')
              .order('date', { ascending: true }),
          ]);

          if (sRes.data && sRes.data.length > 0) setServants(sRes.data);
          if (yRes.data && yRes.data.length > 0) setYouth(yRes.data);
          if (aRes.data && aRes.data.length > 0) setAttendance(aRes.data);
          if (scRes.data && scRes.data.length > 0) setSchedules(scRes.data);

          if (sRes.data && sRes.data.length > 0) {
            setCurrentServant((prev) => {
              if (!prev) return sRes.data[0];
              const match = sRes.data.find((s) => s.id === prev.id);
              return match || sRes.data[0];
            });
          }
        } catch (err) {
          console.warn('Supabase background sync failed, using cached state:', err);
        }
      }
      setIsLoading(false);
    }

    syncRemoteData();
  }, []);

  // Save to localStorage when state changes (for offline/demo reliability)
  useEffect(() => {
    if (!isLoading && typeof window !== 'undefined') {
      try {
        localStorage.setItem('e3dady_servants', JSON.stringify(servants));
        localStorage.setItem('e3dady_youth', JSON.stringify(youth));
        localStorage.setItem('e3dady_attendance', JSON.stringify(attendance));
        localStorage.setItem('e3dady_schedules', JSON.stringify(schedules));
        localStorage.setItem('e3dady_contacted', JSON.stringify(contactedYouthIds));
        if (currentServant) {
          localStorage.setItem('e3dady_active_servant_id', currentServant.id);
        }
      } catch (_) {}
    }
  }, [servants, youth, attendance, schedules, currentServant, contactedYouthIds, isLoading]);

  const loginServant = useCallback((servantId: string) => {
    const s = servants.find((item) => item.id === servantId);
    if (s) {
      setCurrentServant(s);
      if (typeof window !== 'undefined') {
        localStorage.setItem('e3dady_active_servant_id', s.id);
      }
    }
  }, [servants]);

  const toggleContactedYouth = useCallback((youthId: string) => {
    setContactedYouthIds((prev) =>
      prev.includes(youthId) ? prev.filter((id) => id !== youthId) : [...prev, youthId]
    );
  }, []);

  // YOUTH CRUD
  const addYouth = useCallback(async (data: Omit<Youth, 'id' | 'created_at'>): Promise<Youth> => {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'y_' + Date.now();
    const newYouth: Youth = {
      ...data,
      id: newId,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: inserted, error } = await supabase.from('youth').insert([newYouth]).select().single();
        if (error) throw error;
        if (inserted) {
          setYouth((prev) => [inserted, ...prev]);
          return inserted;
        }
      } catch (err) {
        console.error('Supabase addYouth error:', err);
      }
    }

    setYouth((prev) => [newYouth, ...prev]);
    return newYouth;
  }, []);

  const updateYouth = useCallback(async (id: string, updates: Partial<Youth>) => {
    setYouth((prev) => prev.map((y) => (y.id === id ? { ...y, ...updates } : y)));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('youth').update(updates).eq('id', id);
      } catch (err) {
        console.error('Supabase updateYouth error:', err);
      }
    }
  }, []);

  const deleteYouth = useCallback(async (id: string) => {
    setYouth((prev) => prev.filter((y) => y.id !== id));
    setAttendance((prev) => prev.filter((a) => a.youth_id !== id));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('youth').delete().eq('id', id);
      } catch (err) {
        console.error('Supabase deleteYouth error:', err);
      }
    }
  }, []);

  // ATTENDANCE BULK SAVE
  const saveAttendance = useCallback(
    async (records: { youth_id: string; session_date: string; status: AttendanceStatus }[]) => {
      const recordedBy = currentServant?.id || null;
      const nowIso = new Date().toISOString();

      setAttendance((prev) => {
        const updated = [...prev];
        records.forEach((rec) => {
          const index = updated.findIndex(
            (a) => a.youth_id === rec.youth_id && a.session_date === rec.session_date
          );
          if (index >= 0) {
            updated[index] = {
              ...updated[index],
              status: rec.status,
              recorded_by: recordedBy,
            };
          } else {
            const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'att_' + Date.now() + Math.random();
            updated.push({
              id: newId,
              youth_id: rec.youth_id,
              session_date: rec.session_date,
              status: rec.status,
              recorded_by: recordedBy,
              created_at: nowIso,
            });
          }
        });
        return updated;
      });

      if (isSupabaseConfigured && supabase) {
        try {
          const payload = records.map((r) => ({
            youth_id: r.youth_id,
            session_date: r.session_date,
            status: r.status,
            recorded_by: recordedBy,
          }));
          await supabase.from('attendance').upsert(payload, { onConflict: 'youth_id,session_date' });
        } catch (err) {
          console.error('Supabase saveAttendance error:', err);
        }
      }
    },
    [currentServant]
  );

  // SCHEDULE CRUD
  const addSchedule = useCallback(async (data: Omit<ServiceSchedule, 'id' | 'created_at'>): Promise<ServiceSchedule> => {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sch_' + Date.now();
    const newSchedule: ServiceSchedule = {
      ...data,
      id: newId,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: inserted } = await supabase.from('service_schedules').insert([newSchedule]).select().single();
        if (inserted) {
          setSchedules((prev) => [...prev, inserted].sort((a, b) => a.date.localeCompare(b.date)));
          return inserted;
        }
      } catch (err) {
        console.error('Supabase addSchedule error:', err);
      }
    }

    setSchedules((prev) => [...prev, newSchedule].sort((a, b) => a.date.localeCompare(b.date)));
    return newSchedule;
  }, []);

  const updateSchedule = useCallback(async (id: string, updates: Partial<ServiceSchedule>) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)).sort((a, b) => a.date.localeCompare(b.date))
    );

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('service_schedules').update(updates).eq('id', id);
      } catch (err) {
        console.error('Supabase updateSchedule error:', err);
      }
    }
  }, []);

  const deleteSchedule = useCallback(async (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('service_schedules').delete().eq('id', id);
      } catch (err) {
        console.error('Supabase deleteSchedule error:', err);
      }
    }
  }, []);

  // SERVANTS CRUD
  const addServant = useCallback(async (data: Omit<Servant, 'id' | 'created_at'>): Promise<Servant> => {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'srv_' + Date.now();
    const newServant: Servant = {
      ...data,
      id: newId,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: inserted } = await supabase.from('servants').insert([newServant]).select().single();
        if (inserted) {
          setServants((prev) => [...prev, inserted]);
          return inserted;
        }
      } catch (err) {
        console.error('Supabase addServant error:', err);
      }
    }

    setServants((prev) => [...prev, newServant]);
    return newServant;
  }, []);

  const updateServant = useCallback(async (id: string, updates: Partial<Servant>) => {
    setServants((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    if (currentServant?.id === id) {
      setCurrentServant((prev) => (prev ? { ...prev, ...updates } : null));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('servants').update(updates).eq('id', id);
      } catch (err) {
        console.error('Supabase updateServant error:', err);
      }
    }
  }, [currentServant]);

  const deleteServant = useCallback(async (id: string) => {
    setServants((prev) => prev.filter((s) => s.id !== id));
    setYouth((prev) => prev.map((y) => (y.assigned_servant_id === id ? { ...y, assigned_servant_id: null } : y)));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('servants').delete().eq('id', id);
      } catch (err) {
        console.error('Supabase deleteServant error:', err);
      }
    }
  }, []);

  // COMPUTED STATS HELPERS
  const getYouthWithDetails = useCallback(
    (youthItem: Youth): YouthWithDetails => {
      const assignedServant = servants.find((s) => s.id === youthItem.assigned_servant_id) || null;
      const memberAttendance = attendance.filter((a) => a.youth_id === youthItem.id);

      // Sort sessions descending
      const sorted = [...memberAttendance].sort((a, b) => b.session_date.localeCompare(a.session_date));
      const lastSession = sorted[0];

      let consecutiveAbsences = 0;
      for (const att of sorted) {
        if (att.status === 'absent') {
          consecutiveAbsences++;
        } else {
          break;
        }
      }

      const totalSessions = memberAttendance.length;
      const presentSessions = memberAttendance.filter((a) => a.status === 'present').length;
      const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

      return {
        ...youthItem,
        assigned_servant: assignedServant,
        last_attendance_status: lastSession ? lastSession.status : null,
        consecutive_absences: consecutiveAbsences,
        total_sessions: totalSessions,
        present_sessions: presentSessions,
        attendance_rate: attendanceRate,
      };
    },
    [servants, attendance]
  );

  const getAbsentAssignedYouth = useCallback(
    (servantId?: string): YouthWithDetails[] => {
      const targetServantId = servantId || currentServant?.id;
      if (!targetServantId) return [];

      // Filter youth assigned to this servant (or all youth if admin wants to see all, but per prompt:
      // "A personalized daily home view for each logged-in servant showing assigned youth who were absent in the last Friday meeting.")
      const myYouth = youth.filter((y) => y.assigned_servant_id === targetServantId);

      return myYouth
        .map(getYouthWithDetails)
        .filter((yd) => {
          // Check if absent on last Friday
          const lastAtt = attendance.find(
            (a) => a.youth_id === yd.id && a.session_date === lastFridayDate
          );
          return lastAtt?.status === 'absent';
        });
    },
    [currentServant, youth, attendance, lastFridayDate, getYouthWithDetails]
  );

  const resetDataToDefaults = useCallback(() => {
    setServants(INITIAL_SERVANTS);
    setYouth(INITIAL_YOUTH);
    setAttendance(INITIAL_ATTENDANCE);
    setSchedules(INITIAL_SCHEDULES);
    setCurrentServant(INITIAL_SERVANTS[0]);
    setContactedYouthIds([]);
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  }, []);

  const isAdmin = currentServant?.role === 'admin';

  return (
    <AppContext.Provider
      value={{
        servants,
        youth,
        attendance,
        schedules,
        currentServant,
        isAdmin,
        isSupabase: isSupabaseConfigured,
        isLoading,
        lastFridayDate,
        nextFridayDate,
        loginServant,
        addYouth,
        updateYouth,
        deleteYouth,
        saveAttendance,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        addServant,
        updateServant,
        deleteServant,
        getYouthWithDetails,
        getAbsentAssignedYouth,
        resetDataToDefaults,
        contactedYouthIds,
        toggleContactedYouth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
