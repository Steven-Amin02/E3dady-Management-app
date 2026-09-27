'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Servant, Youth, Attendance, ServiceSchedule, AttendanceStatus, YouthWithDetails, PastoralOutcomeCategory } from '@/types/database';
import { INITIAL_SERVANTS, INITIAL_YOUTH, INITIAL_SCHEDULES, INITIAL_ATTENDANCE } from '@/lib/mockData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { selectDailyFollowUpYouth, DailyFollowUpCandidate } from '@/lib/followUpRotation';
import { evaluateYouthPastoralRisk } from '@/lib/pastoralAnalytics';
import { toLocalDateString } from '@/lib/utils';

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
  // Attendance (Shared)
  saveAttendance: (records: { youth_id: string; session_date: string; status: AttendanceStatus }[]) => Promise<{
    success: boolean;
    cloudSynced: boolean;
    count: number;
    error?: string;
  }>;
  // Schedule CRUD
  addSchedule: (data: Omit<ServiceSchedule, 'id' | 'created_at'>) => Promise<ServiceSchedule>;
  updateSchedule: (id: string, updates: Partial<ServiceSchedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  // Servants CRUD
  addServant: (data: Omit<Servant, 'id' | 'created_at'>) => Promise<Servant>;
  updateServant: (id: string, updates: Partial<Servant>) => Promise<void>;
  deleteServant: (id: string) => Promise<void>;
  // Helpers & Follow-up rotation
  getYouthWithDetails: (youthItem: Youth) => YouthWithDetails;
  getAbsentAssignedYouth: (servantId?: string) => YouthWithDetails[];
  dailyFollowUpYouth: DailyFollowUpCandidate | null;
  markYouthContacted: (
    youthId: string,
    method?: 'call' | 'whatsapp',
    notes?: string,
    outcome?: PastoralOutcomeCategory
  ) => Promise<void>;
  resetDataToDefaults: () => void;
  contactedYouthIds: string[];
  toggleContactedYouth: (youthId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to calculate previous Friday
export function calculateLastFriday(fromDate = new Date()): string {
  const d = new Date(fromDate);
  const day = d.getDay(); // 0 is Sunday, 5 is Friday
  let diff = (day + 7 - 5) % 7;
  if (diff === 0) {
    diff = 7;
  }
  d.setDate(d.getDate() - diff);
  return toLocalDateString(d);
}

// Helper to calculate upcoming Friday
export function calculateNextFriday(fromDate = new Date()): string {
  const d = new Date(fromDate);
  const day = d.getDay(); // 0 is Sunday, 5 is Friday
  const diff = (5 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return toLocalDateString(d);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [servants, setServants] = useState<Servant[]>(INITIAL_SERVANTS);
  const [youth, setYouth] = useState<Youth[]>(INITIAL_YOUTH);
  const [attendance, setAttendance] = useState<Attendance[]>(INITIAL_ATTENDANCE);
  const [schedules, setSchedules] = useState<ServiceSchedule[]>(INITIAL_SCHEDULES);
  const [currentServant, setCurrentServant] = useState<Servant | null>(INITIAL_SERVANTS[0] || null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [contactedYouthIds, setContactedYouthIds] = useState<string[]>([]);

  // Fixed Friday references for realistic attendance
  const lastFridayDate = useMemo(() => calculateLastFriday(), []);
  const nextFridayDate = useMemo(() => calculateNextFriday(), []);

  // Initialize data: Instant Local-First Hydration (0ms perceived load) + SWR Supabase fetch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const CURRENT_VERSION = 'v6_supabase_sync';
        const version = localStorage.getItem('e3dady_data_version');

        if (version !== CURRENT_VERSION) {
          localStorage.removeItem('e3dady_servants');
          localStorage.removeItem('e3dady_youth');
          localStorage.removeItem('e3dady_attendance');
          localStorage.removeItem('e3dady_schedules');
          localStorage.removeItem('e3dady_active_servant_id');
          localStorage.removeItem('e3dady_contacted');
          localStorage.setItem('e3dady_data_version', CURRENT_VERSION);

          setServants(INITIAL_SERVANTS);
          setYouth(INITIAL_YOUTH);
          setAttendance(INITIAL_ATTENDANCE);
          setSchedules(INITIAL_SCHEDULES);
          setCurrentServant(INITIAL_SERVANTS[0] || null);

          localStorage.setItem('e3dady_servants', JSON.stringify(INITIAL_SERVANTS));
          localStorage.setItem('e3dady_youth', JSON.stringify(INITIAL_YOUTH));
          localStorage.setItem('e3dady_attendance', JSON.stringify(INITIAL_ATTENDANCE));
          localStorage.setItem('e3dady_schedules', JSON.stringify(INITIAL_SCHEDULES));
          if (INITIAL_SERVANTS[0]) {
            localStorage.setItem('e3dady_active_servant_id', INITIAL_SERVANTS[0].id);
          }
        } else {
          const savedServants = localStorage.getItem('e3dady_servants');
          const savedYouth = localStorage.getItem('e3dady_youth');
          const savedAttendance = localStorage.getItem('e3dady_attendance');
          const savedSchedules = localStorage.getItem('e3dady_schedules');
          const savedServantId = localStorage.getItem('e3dady_active_servant_id');
          const savedContacted = localStorage.getItem('e3dady_contacted');

          if (savedServants) {
            try {
              const list: Servant[] = JSON.parse(savedServants);
              if (Array.isArray(list) && list.length > 0) {
                setServants(list);
                const found = list.find((s: Servant) => s.id === savedServantId);
                setCurrentServant(found || list[0] || null);
              }
            } catch (_) {}
          }

          if (savedYouth) {
            try {
              const list = JSON.parse(savedYouth);
              if (Array.isArray(list) && list.length > 0) {
                setYouth(list);
              } else {
                setYouth(INITIAL_YOUTH);
              }
            } catch (_) {
              setYouth(INITIAL_YOUTH);
            }
          }

          if (savedAttendance) {
            try {
              const list = JSON.parse(savedAttendance);
              if (Array.isArray(list) && list.length > 0) {
                let needsSave = false;
                const converted = list.map((a: Attendance) => {
                  if (a.session_date === '2026-09-24') {
                    needsSave = true;
                    return {
                      ...a,
                      session_date: '2026-09-25',
                      id: a.id ? a.id.replace('2026-09-24', '2026-09-25') : `att-2026-09-25-${a.youth_id?.slice(-4) || 'mig'}`,
                    };
                  }
                  return a;
                });

                // Deduplicate so each youth has at most one record per session_date
                const seen = new Set<string>();
                const migratedList: Attendance[] = [];
                for (const item of converted) {
                  const key = `${item.youth_id}_${item.session_date}`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    migratedList.push(item);
                  } else {
                    needsSave = true;
                  }
                }

                setAttendance(migratedList);
                if (needsSave) {
                  localStorage.setItem('e3dady_attendance', JSON.stringify(migratedList));
                }
              } else {
                setAttendance(INITIAL_ATTENDANCE);
              }
            } catch (_) {
              setAttendance(INITIAL_ATTENDANCE);
            }
          }

          if (savedSchedules) {
            try {
              const list = JSON.parse(savedSchedules);
              if (Array.isArray(list) && list.length > 0) {
                setSchedules(list);
              } else {
                setSchedules(INITIAL_SCHEDULES);
              }
            } catch (_) {
              setSchedules(INITIAL_SCHEDULES);
            }
          }

          if (savedContacted) {
            try {
              setContactedYouthIds(JSON.parse(savedContacted));
            } catch (_) {}
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.warn('Local cache read error:', err);
        setIsLoading(false);
      }
    }

    // Step 2: Non-blocking background fetch from Supabase
    async function syncRemoteData() {
      if (isSupabaseConfigured && supabase) {
        try {
          const [sRes, yRes, aRes, scRes] = await Promise.all([
            supabase
              .from('servants')
              .select('id, name, phone, role')
              .order('name'),
            supabase
              .from('youth')
              .select('id, name, phone, school_year, assigned_servant_id, notes, last_contacted_at')
              .order('name'),
            supabase
              .from('attendance')
              .select('id, youth_id, session_date, status, recorded_by')
              .order('session_date', { ascending: false })
              .limit(500),
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

  // Step 3: Multi-Tab Broadcast & Cross-Window Local Sync
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('e3dady_sync_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'ATTENDANCE_UPDATED' && Array.isArray(event.data?.attendance)) {
          setAttendance(event.data.attendance);
        }
      };
    } catch (_) {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'e3dady_attendance' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setAttendance(parsed);
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, []);

  // Step 4: Real-time Cloud Synchronization (Supabase postgres_changes)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const channel = supabase
        .channel('attendance_realtime_stream')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attendance' },
          (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const updatedRecord = payload.new as Attendance;
              setAttendance((prev) => {
                const idx = prev.findIndex(
                  (a) => a.youth_id === updatedRecord.youth_id && a.session_date === updatedRecord.session_date
                );
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = updatedRecord;
                  return copy;
                }
                return [updatedRecord, ...prev];
              });
            } else if (payload.eventType === 'DELETE') {
              const oldRec = payload.old as Partial<Attendance>;
              if (oldRec.id) {
                setAttendance((prev) => prev.filter((a) => a.id !== oldRec.id));
              }
            }
          }
        )
        .subscribe();

      return () => {
        if (supabase) supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Realtime channel error:', err);
    }
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

  // 1-Person Daily Follow-Up Selection
  const dailyFollowUpYouth = useMemo(() => {
    if (!currentServant) return null;
    return selectDailyFollowUpYouth(youth, attendance, currentServant.id);
  }, [youth, attendance, currentServant]);

  // Mark Youth Contacted Action
  const markYouthContacted = useCallback(
    async (
      youthId: string,
      method: 'call' | 'whatsapp' = 'call',
      notes: string = '',
      outcome?: PastoralOutcomeCategory
    ) => {
      const nowIso = new Date().toISOString();
      const todayDate = nowIso.split('T')[0];

      // Optimistic state update
      setYouth((prev) =>
        prev.map((y) => (y.id === youthId ? { ...y, last_contacted_at: nowIso } : y))
      );

      setContactedYouthIds((prev) =>
        prev.includes(youthId) ? prev : [...prev, youthId]
      );

      // Save locally to follow_up_logs in localStorage
      if (typeof window !== 'undefined') {
        try {
          const storedLogs = JSON.parse(localStorage.getItem('e3dady_follow_up_logs') || '[]');
          storedLogs.unshift({
            id: 'log_' + Date.now(),
            youth_id: youthId,
            servant_id: currentServant?.id || null,
            contact_date: todayDate,
            method,
            notes,
            outcome,
            created_at: nowIso,
          });
          localStorage.setItem('e3dady_follow_up_logs', JSON.stringify(storedLogs.slice(0, 100)));
        } catch (_) {}
      }

      // Supabase remote sync
      if (isSupabaseConfigured && supabase && currentServant) {
        try {
          await Promise.all([
            supabase
              .from('youth')
              .update({ last_contacted_at: nowIso })
              .eq('id', youthId),
            supabase
              .from('follow_up_logs')
              .insert([
                {
                  youth_id: youthId,
                  servant_id: currentServant.id,
                  contact_date: todayDate,
                  method: method,
                  notes: notes,
                  ...(outcome ? { outcome } : {}),
                },
              ]),
          ]);
        } catch (err) {
          console.warn('Supabase markYouthContacted sync warning:', err);
        }
      }
    },
    [currentServant]
  );

  // YOUTH CRUD
  const addYouth = useCallback(async (data: Omit<Youth, 'id' | 'created_at'>): Promise<Youth> => {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'y_' + Date.now();
    const newYouth: Youth = {
      ...data,
      id: newId,
      created_at: new Date().toISOString(),
    };

    setYouth((prev) => [...prev, newYouth]);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: inserted } = await supabase.from('youth').insert([newYouth]).select().single();
        if (inserted) return inserted;
      } catch (err) {
        console.error('Supabase addYouth error:', err);
      }
    }
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

  // ATTENDANCE BULK SAVE (SHARED FOR ALL SERVANTS)
  const saveAttendance = useCallback(
    async (records: { youth_id: string; session_date: string; status: AttendanceStatus }[]) => {
      const recordedBy = currentServant?.id || null;
      const nowIso = new Date().toISOString();

      let latestAttendanceList: Attendance[] = [];

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
        latestAttendanceList = updated;
        return updated;
      });

      // 1. Immediately and synchronously persist to localStorage so it is never lost
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('e3dady_attendance', JSON.stringify(latestAttendanceList));
          // Broadcast to other open tabs/windows
          try {
            const bc = new BroadcastChannel('e3dady_sync_channel');
            bc.postMessage({ type: 'ATTENDANCE_UPDATED', attendance: latestAttendanceList });
            bc.close();
          } catch (_) {}
        } catch (storageErr) {
          console.warn('LocalStorage save warning:', storageErr);
        }
      }

      // 2. Cloud Sync via Supabase
      let cloudSynced = false;
      let syncError: string | undefined = undefined;

      if (isSupabaseConfigured && supabase) {
        try {
          const payload = records.map((r) => ({
            youth_id: r.youth_id,
            session_date: r.session_date,
            status: r.status,
            recorded_by: recordedBy,
          }));

          const { error } = await supabase
            .from('attendance')
            .upsert(payload, { onConflict: 'youth_id,session_date' });

          if (error) {
            console.error('Supabase saveAttendance error:', error);
            syncError = error.message;
          } else {
            cloudSynced = true;
          }
        } catch (err: any) {
          console.error('Supabase saveAttendance exception:', err);
          syncError = err?.message || 'Network error';
        }
      }

      return {
        success: true,
        cloudSynced,
        count: records.length,
        error: syncError,
      };
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

    setServants((prev) => [...prev, newServant]);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: inserted } = await supabase.from('servants').insert([newServant]).select().single();
        if (inserted) return inserted;
      } catch (err) {
        console.error('Supabase addServant error:', err);
      }
    }
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
      const triageResult = evaluateYouthPastoralRisk(youthItem, attendance);

      return {
        ...youthItem,
        assigned_servant: assignedServant,
        last_attendance_status: lastSession ? lastSession.status : null,
        consecutive_absences: consecutiveAbsences,
        total_sessions: totalSessions,
        present_sessions: presentSessions,
        attendance_rate: attendanceRate,
        triage_category: triageResult.category,
      };
    },
    [servants, attendance]
  );

  const getAbsentAssignedYouth = useCallback(
    (servantId?: string): YouthWithDetails[] => {
      const targetServantId = servantId || currentServant?.id;
      if (!targetServantId) return [];

      const myYouth = youth.filter((y) => y.assigned_servant_id === targetServantId);

      return myYouth
        .map(getYouthWithDetails)
        .filter((yd) => {
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
        dailyFollowUpYouth,
        markYouthContacted,
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
