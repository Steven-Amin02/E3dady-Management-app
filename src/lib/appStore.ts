import type { Session } from '@supabase/supabase-js';
import type { Attendance, AttendanceChange, AttendanceDraftChange, AttendanceStatus, DailyFollowUpTask, PastoralOutcomeCategory, Servant, ServiceSchedule, Youth, YouthWithDetails } from '@/types/database';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { offlineStorage } from '@/lib/offlineStorage';
import { errorMessage, operationKey, operationPrefix, type PendingOperation, replayOutbox } from '@/lib/outbox';
import { emptySnapshot, fetchSnapshot, fetchAttendanceRange, requireClient, sendOperation, type Snapshot } from '@/lib/repository';
import { attendanceKey, applyAttendanceChanges, editDraft, indexAttendance, fridayWindow } from '@/lib/attendanceModel';
import { evaluateYouthPastoralRisk } from '@/lib/pastoralAnalytics';
import { type DailyFollowUpCandidate, selectDailyFollowUpYouth } from '@/lib/followUpRotation';
import { academicYearStart, dateDistance, dayOfWeek, precedingFriday, serviceDate, upcomingFriday, validDate } from '@/lib/serviceDate';

export type AttendanceDrafts = Record<string, Record<string, AttendanceDraftChange>>;
interface AppData {
  userId: string | null;
  isLoading: boolean;
  isSupabase: boolean;
  status: 'signed_out' | 'loading' | 'online' | 'offline' | 'error';
  error: string | null;
  syncError: string | null;
  currentServant: Servant | null;
  isAdmin: boolean;
  servants: Servant[];
  youth: Youth[];
  attendance: Attendance[];
  schedules: ServiceSchedule[];
  today: string;
  lastFridayDate: string;
  nextFridayDate: string;
  dailyFollowUpYouth: DailyFollowUpCandidate | null;
  pendingOperations: PendingOperation[];
  attendanceDrafts: AttendanceDrafts;
  hasLegacyBackup: boolean;
  attendanceRange: { from: string; to: string };
  loadedSessionDates: string[];
}

export function createAppStore() {
  const listeners = new Set<() => void>();
  let remote = emptySnapshot();
  let data: AppData = {
    userId: null, isLoading: true, isSupabase: isSupabaseConfigured, status: 'loading', error: null, syncError: null,
    currentServant: null, isAdmin: false, servants: [], youth: [], attendance: [], schedules: [],
    today: '', lastFridayDate: '', nextFridayDate: '', dailyFollowUpYouth: null, pendingOperations: [], attendanceDrafts: {}, hasLegacyBackup: false,
    attendanceRange: { from: '', to: '' }, loadedSessionDates: [],
  };
  let refreshPromise: Promise<void> | null = null;
  let sessionRead: Promise<void> | null = null;
  let flushing = false, generation = 0;
  let flushAgain = false;
  let authIdentity: string | null | undefined;
  let editQueue = Promise.resolve();
  const loadedDates = new Set<string>();
  let broadcast: BroadcastChannel | undefined;
  const set = (changes: Partial<AppData>) => { data = { ...data, ...changes }; for (const listener of listeners) listener(); };
  const currentUser = () => {
    if (!data.userId || !data.currentServant) throw new Error('يلزم تسجيل الدخول بحساب خادم معتمد');
    return { userId: data.userId, actorId: data.currentServant.id };
  };
  const report = (error: unknown) => set({ error: errorMessage(error) });

  function publish() {
    const today = serviceDate();
    const currentServant = remote.servants.find(s => s.auth_user_id === data.userId) ?? null;
    let attendance: Attendance[] = remote.attendance;
    let youth: Youth[] = remote.youth;
    for (const operation of data.pendingOperations) {
      if (operation.kind === 'attendance') attendance = applyAttendanceChanges(attendance, operation.changes, operation.actorId);
      else youth = youth.map(y => y.id === operation.youthId ? { ...y,
        last_contacted_at: !y.last_contacted_at || operation.contactedAt > y.last_contacted_at ? operation.contactedAt : y.last_contacted_at,
      } : y);
    }
    const task = remote.tasks.find(t => t.servant_id === currentServant?.id && t.task_date === today);
    const person = youth.find(y => y.id === task?.youth_id && y.assigned_servant_id === currentServant?.id);
    const candidate = person && currentServant ? selectDailyFollowUpYouth([person], attendance, currentServant.id, today) : null;
    const contactPending = task && data.pendingOperations.some(op => op.kind === 'contact' && op.youthId === task.youth_id && serviceDate(new Date(op.contactedAt)) === today);
    set({ servants: remote.servants, schedules: remote.schedules, youth, attendance, currentServant,
      attendanceRange: remote.attendanceRange, loadedSessionDates: remote.loadedSessionDates,
      isAdmin: currentServant?.role === 'admin', today, lastFridayDate: precedingFriday(today), nextFridayDate: upcomingFriday(today),
      dailyFollowUpYouth: candidate ? { ...candidate, alreadyContactedToday: Boolean(task?.completed_at || contactPending) } : null });
  }
  async function readPending(userId: string) {
    const operations = (await offlineStorage.list<PendingOperation>(operationPrefix(userId)))
      .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt) || a.id.localeCompare(b.id));
    if (data.userId === userId) set({ pendingOperations: operations, syncError: operations.find(op => op.error)?.error ?? null });
  }
  async function refresh() {
    if (refreshPromise) return refreshPromise;
    const userId = data.userId, ticket = generation;
    if (!userId) return;
    const request = (async () => {
      try {
        const readingSession = sessionRead;
        if (readingSession) await readingSession.catch(() => {});
        const snapshot = await fetchSnapshot();
        const extraDates = [...loadedDates].filter(date => date < snapshot.attendanceRange.from || date > snapshot.attendanceRange.to).sort();
        const ranges: string[][] = [];
        for (const date of extraDates) {
          const last = ranges.at(-1);
          if (last && dateDistance(date, last.at(-1)!) === 7) last.push(date); else ranges.push([date]);
        }
        for (const range of ranges) {
          const rows = await fetchAttendanceRange(range[0], range.at(-1)!);
          const dates = new Set(range);
          snapshot.attendance = snapshot.attendance.filter(a => !dates.has(a.session_date)).concat(rows);
        }
        snapshot.loadedSessionDates = [...loadedDates];
        if (ticket !== generation || data.userId !== userId) return;
        const actor = snapshot.servants.find(s => s.auth_user_id === userId);
        if (!actor) throw new Error('هذا الحساب غير مرتبط بخادم. اطلب من مسؤول الخدمة ربط الحساب.');
        let task: DailyFollowUpTask | undefined = snapshot.tasks.find(t => t.servant_id === actor.id && t.task_date === serviceDate());
        if (!task) {
          const candidate = selectDailyFollowUpYouth(snapshot.youth, snapshot.attendance, actor.id, serviceDate());
          if (candidate) {
            const { data: claimed, error } = await requireClient().rpc('claim_daily_follow_up_task', { p_youth_id: candidate.youth.id });
            if (error) throw error;
            task = claimed?.[0];
            if (task) snapshot.tasks = [...snapshot.tasks, task];
          }
        }
        if (ticket !== generation || data.userId !== userId) return;
        remote = snapshot;
        await offlineStorage.set(`${userId}/snapshot`, snapshot);
        if (ticket !== generation) return;
        await readPending(userId);
        set({ status: 'online', isLoading: false });
        publish();
      } catch (error) {
        if (ticket !== generation) return;
        set({ status: !navigator.onLine ? 'offline' : 'error', syncError: errorMessage(error), isLoading: false });
        publish();
      }
    })();
    refreshPromise = request;
    void request.finally(() => { if (refreshPromise === request) refreshPromise = null; });
    return request;
  }
  async function flush() {
    const userId = data.userId;
    if (flushing) { flushAgain = true; return; }
    if (!userId || !navigator.onLine) return;
    flushing = true;
    const run = async () => {
      await replayOutbox(userId, offlineStorage, sendOperation, () => data.userId === userId);
      if (data.userId !== userId) return;
      await readPending(userId);
      if (refreshPromise) await refreshPromise;
      await refresh();
      broadcast?.postMessage({ type: 'refresh', userId });
    };
    try {
      if (navigator.locks) await navigator.locks.request(`e3dady-sync-${userId}`, run);
      else await run();
    } catch (error) { set({ syncError: errorMessage(error) }); }
    finally { flushing = false; if (flushAgain) { flushAgain = false; void flush(); } }
  }
  async function sessionChanged(session: Session | null) {
    const userId = session?.user.id ?? null;
    if (userId === authIdentity) return;
    authIdentity = userId;
    generation++; refreshPromise = null;
    const ticket = generation;
    remote = emptySnapshot(); loadedDates.clear();
    set({ userId, status: userId ? 'loading' : 'signed_out', isLoading: Boolean(userId), attendanceDrafts: {}, pendingOperations: [], error: null, syncError: null });
    publish();
    if (!userId) return;
    try {
      const [cached, drafts] = await Promise.all([offlineStorage.get<Snapshot>(`${userId}/snapshot`), offlineStorage.get<AttendanceDrafts>(`${userId}/drafts`)]);
      if (ticket !== generation) return;
      if (cached) {
        remote = cached;
        for (const date of cached.loadedSessionDates ?? []) loadedDates.add(date);
      }
      set({ attendanceDrafts: drafts ?? {} });
      await readPending(userId); publish();
    } catch (error) { report(error); }
    if (ticket !== generation) return;
    await refresh(); void flush();
  }
  async function confirmed<T>(action: () => Promise<T>): Promise<T> {
    const { userId } = currentUser();
    if (!navigator.onLine) throw new Error('هذا التعديل يحتاج اتصالاً بالإنترنت؛ احتفظ بالنموذج وحاول مجدداً.');
    try {
      const result = await action();
      if (data.userId === userId) {
        if (refreshPromise) await refreshPromise;
        await refresh(); broadcast?.postMessage({ type: 'refresh', userId });
      }
      return result;
    } catch (error) { report(error); throw error; }
  }
  async function enqueue(operation: PendingOperation) {
    await offlineStorage.set(operationKey(operation), operation);
    if (data.userId !== operation.userId) return;
    await readPending(operation.userId); publish();
    broadcast?.postMessage({ type: 'refresh', userId: operation.userId });
  }
  const actions = {
    async downloadLegacyBackup() {
      currentUser();
      if (!data.isAdmin) throw new Error('هذه النسخة متاحة لمسؤول الخدمة فقط');
      const backups = await offlineStorage.list('legacy/backup/');
      const url = URL.createObjectURL(new Blob([JSON.stringify(backups, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'e3dady-legacy-backup.json'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    async signIn(email: string, password: string) {
      const { error } = await requireClient().auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    },
    async resetPassword(email: string) {
      const normalizedEmail = email.trim();
      if (!normalizedEmail) throw new Error('اكتب البريد الإلكتروني أولاً.');
      const { error } = await requireClient().auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
    },
    async signOut() {
      const userId = data.userId;
      if (data.pendingOperations.length || Object.values(data.attendanceDrafts).some(d => Object.keys(d).length)) throw new Error('احفظ أو ألغِ المسودات والمحاولات المعلقة قبل تسجيل الخروج.');
      const { error } = await requireClient().auth.signOut();
      if (error) throw error;
      if (userId) { await offlineStorage.remove(`${userId}/snapshot`); await offlineStorage.remove(`${userId}/drafts`); }
    },
    dismissError: () => set({ error: null }), refresh, retrySync: flush,
    promoteAcademicYear: () => confirmed(async () => {
      const { error } = await requireClient().rpc('promote_academic_year', {});
      if (error) throw error;
    }),
    async discardOperation(id: string) {
      const { userId } = currentUser();
      const op = data.pendingOperations.find(op => op.id === id);
      if (!op || !op.blocked) throw new Error('انتظر انتهاء المزامنة قبل إلغاء المحاولة');
      await offlineStorage.remove(operationKey(op)); await readPending(userId); publish(); await refresh();
    },
    editAttendance(date: string, edits: Record<string, AttendanceStatus | null>) {
      const { userId } = currentUser();
      const operation = async () => {
        if (data.userId !== userId) throw new Error('تغير الحساب');
        if (data.pendingOperations.some(op => op.kind === 'attendance' && op.changes.some(c => c.session_date === date))) throw new Error('توجد محاولة حفظ معلقة لهذه الجلسة؛ انتظر المزامنة أو عالج الخطأ أولاً.');
        const drafts = await offlineStorage.mutate<AttendanceDrafts, AttendanceDrafts>(`${userId}/drafts`, previous => {
          const next = { ...previous, [date]: editDraft(previous?.[date] ?? {}, remote.attendance, date, edits) };
          return { value: next, result: next };
        });
        if (data.userId === userId) set({ attendanceDrafts: drafts });
        broadcast?.postMessage({ type: 'drafts', userId });
      };
      const result = editQueue.then(operation); editQueue = result.catch(report); return result;
    },
    async discardDraft(date: string) {
      await editQueue;
      const { userId } = currentUser();
      const drafts = await offlineStorage.mutate<AttendanceDrafts, AttendanceDrafts>(`${userId}/drafts`, previous => {
        const next = { ...previous }; delete next[date]; return { value: next, result: next };
      });
      if (data.userId === userId) set({ attendanceDrafts: drafts });
      broadcast?.postMessage({ type: 'drafts', userId });
    },
    ensureSession(date: string) {
      const activeRefresh = refreshPromise;
      const previousRead = sessionRead;
      const request = (async () => {
      if (previousRead) await previousRead.catch(() => {});
      if (activeRefresh) await activeRefresh;
      if (!validDate(date) || dayOfWeek(date) !== 5) throw new Error('اختر تاريخ يوم جمعة صالح');
      const { userId } = currentUser();
      if (!navigator.onLine) {
        if (!(remote.attendanceRange.from && date >= remote.attendanceRange.from && date <= remote.attendanceRange.to) && !remote.loadedSessionDates.includes(date)) {
          throw new Error('هذه الجلسة غير محملة على الجهاز. اتصل بالإنترنت لتحميل سجلها قبل التعديل.');
        }
        return;
      }
      const dates = fridayWindow(12, date), start = dates[0];
      if (remote.attendanceRange.from && remote.attendanceRange.from <= start && remote.attendanceRange.to >= date) return;
      const rows = await fetchAttendanceRange(start, date);
      if (data.userId !== userId) return;
      for (const day of dates) loadedDates.add(day);
      remote.attendance = remote.attendance.filter(a => a.session_date < start || a.session_date > date).concat(rows);
      remote.loadedSessionDates = [...loadedDates];
      await offlineStorage.set(`${userId}/snapshot`, remote); publish();
      })();
      sessionRead = request;
      const finished = () => { if (sessionRead === request) sessionRead = null; };
      void request.then(finished, finished);
      return request;
    },
    async saveAttendance(date: string, auditCategory = '', auditNotes = '') {
      await editQueue;
      const identity = currentUser();
      const index = indexAttendance(remote.attendance);
      const operation = await offlineStorage.mutate<AttendanceDrafts, PendingOperation | null>(`${identity.userId}/drafts`, previous => {
        const changes: AttendanceChange[] = Object.values(previous?.[date] ?? {}).map(({ youth_id, session_date, status, expected_version }) => ({ youth_id, session_date, status, expected_version }));
        if (!changes.length) return { value: previous ?? {}, result: null };
        for (const change of changes) {
          const existing = index.byKey.get(attendanceKey(change.youth_id, change.session_date));
          if ((existing?.version ?? null) !== change.expected_version) throw new Error('تعارض: عدّل خادم آخر هذه البيانات. ألغِ مسودة الجلسة وحمّل أحدث سجل قبل المحاولة مجدداً.');
        }
        const op: PendingOperation = { ...identity, id: crypto.randomUUID(), queuedAt: new Date().toISOString(), kind: 'attendance', changes, auditCategory, auditNotes };
        const drafts = { ...previous }; delete drafts[date];
        return { value: drafts, result: op, also: [[operationKey(op), op]] };
      });
      if (!operation || operation.kind !== 'attendance') return { success: true, cloudSynced: true, count: 0 };
      if (data.userId !== identity.userId) return { success: true, cloudSynced: false, count: operation.changes.length };
      const drafts = await offlineStorage.get<AttendanceDrafts>(`${identity.userId}/drafts`);
      set({ attendanceDrafts: drafts ?? {} });
      await readPending(identity.userId); publish();
      broadcast?.postMessage({ type: 'refresh', userId: identity.userId });
      await flush();
      const outstanding = data.pendingOperations.find(op => op.id === operation.id);
      if (outstanding?.blocked) throw new Error(outstanding.error);
      return { success: true, cloudSynced: !outstanding, count: operation.changes.length };
    },
    async markYouthContacted(youthId: string, method: 'call' | 'whatsapp' = 'call', notes = '', outcome: PastoralOutcomeCategory = 'encouraged_attending') {
      const identity = currentUser();
      if (data.pendingOperations.some(op => op.kind === 'contact' && op.youthId === youthId)) throw new Error('هذا الافتقاد ينتظر المزامنة بالفعل');
      await enqueue({ ...identity, id: crypto.randomUUID(), queuedAt: new Date().toISOString(), kind: 'contact', youthId, method, notes, outcome, contactedAt: new Date().toISOString() });
      await flush();
      const failed = data.pendingOperations.find(op => op.kind === 'contact' && op.youthId === youthId && op.blocked);
      if (failed) throw new Error(failed.error);
    },
    addYouth: (value: Omit<Youth, 'id' | 'created_at'>) => confirmed(async () => {
      const { data: row, error } = await requireClient().from('youth').insert({ ...value, name: value.name.trim(), phone: value.phone.trim() }).select().single();
      if (error) throw error; return row;
    }),
    updateYouth: (id: string, value: Partial<Youth>) => confirmed(async () => {
      const { error } = await requireClient().from('youth').update({ name: value.name?.trim(), phone: value.phone?.trim(), school_year: value.school_year, assigned_servant_id: value.assigned_servant_id, notes: value.notes, joined_on: value.joined_on }).eq('id', id).select().single(); if (error) throw error;
    }),
    deleteYouth: (id: string) => confirmed(async () => {
      const { error } = await requireClient().from('youth').update({ left_on: serviceDate() }).eq('id', id).select().single(); if (error) throw error;
    }),
    addSchedule: (value: Omit<ServiceSchedule, 'id' | 'created_at'>) => confirmed(async () => {
      const { data: row, error } = await requireClient().from('service_schedules').insert(value).select().single(); if (error) throw error; return row;
    }),
    updateSchedule: (id: string, value: Partial<ServiceSchedule>) => confirmed(async () => {
      const { error } = await requireClient().from('service_schedules').update({ date: value.date, speaker_servant_id: value.speaker_servant_id, lesson_title: value.lesson_title, activity_notes: value.activity_notes }).eq('id', id).select().single(); if (error) throw error;
    }),
    deleteSchedule: (id: string) => confirmed(async () => {
      const { error } = await requireClient().from('service_schedules').delete().eq('id', id).select().single(); if (error) throw error;
    }),
    addServant: (value: Omit<Servant, 'id' | 'created_at'>) => confirmed(async () => {
      const { data: row, error } = await requireClient().from('servants').insert({ name: value.name, phone: value.phone, role: value.role }).select().single(); if (error) throw error; return row;
    }),
    updateServant: (id: string, value: Partial<Servant>) => confirmed(async () => {
      const { error } = await requireClient().from('servants').update({ name: value.name, phone: value.phone, role: value.role }).eq('id', id).select().single(); if (error) throw error;
    }),
    deleteServant: (id: string) => confirmed(async () => {
      const { error } = await requireClient().from('servants').delete().eq('id', id).select().single(); if (error) throw error;
    }),
    getYouthWithDetails(youthItem: Youth): YouthWithDetails {
      const records = (indexAttendance(data.attendance).byYouth.get(youthItem.id) ?? []).filter(a => a.session_date >= academicYearStart(data.today) && a.session_date <= data.lastFridayDate);
      const risk = evaluateYouthPastoralRisk(youthItem, data.attendance, data.lastFridayDate);
      const pendingContact = [...data.pendingOperations].reverse().find(op => op.kind === 'contact' && op.youthId === youthItem.id);
      const outcome = pendingContact?.kind === 'contact' ? pendingContact.outcome : remote.followUpLogs.filter(l => l.youth_id === youthItem.id).sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0]?.outcome;
      const present = records.filter(a => a.status === 'present').length;
      return { ...youthItem, assigned_servant: data.servants.find(s => s.id === youthItem.assigned_servant_id), last_attendance_status: records[0]?.status ?? null,
        consecutive_absences: risk.consecutiveAbsences, total_sessions: records.length, present_sessions: present, attendance_rate: records.length ? Math.round(present / records.length * 100) : 0, triage_category: risk.category, last_follow_up_outcome: outcome };
    },
    getAbsentAssignedYouth(servantId?: string) {
      const index = indexAttendance(data.attendance);
      return data.youth.filter(y => y.assigned_servant_id === (servantId ?? data.currentServant?.id) && index.byKey.get(attendanceKey(y.id, data.lastFridayDate))?.status === 'absent').map(actions.getYouthWithDetails);
    },
  };
  let snapshot = { ...data, ...actions };
  listeners.add(() => { snapshot = { ...data, ...actions }; });
  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    start() {
      // Preserve old unsynchronized work before retiring the unscoped cache.
      void (async () => {
        const entries = Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith('e3dady_')).map(key => [key, localStorage.getItem(key)]));
        if (Object.keys(entries).length) {
          await offlineStorage.set(`legacy/backup/${Date.now()}`, { capturedAt: new Date().toISOString(), entries });
          for (const key of Object.keys(entries)) localStorage.removeItem(key);
        }
        set({ hasLegacyBackup: (await offlineStorage.list('legacy/backup/')).length > 0 });
      })().catch(report);
      if (!supabase) { set({ isLoading: false, status: 'signed_out' }); return () => {}; }
      let stopped = false;
      const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
        queueMicrotask(() => { if (!stopped) void sessionChanged(session); });
      });
      void supabase.auth.getSession().then(({ data: authData, error }) => {
        if (stopped) return;
        if (error) { report(error); set({ isLoading: false }); } else void sessionChanged(authData.session);
      });
      const reconnect = () => { void flush(); };
      const offline = () => set({ status: 'offline' });
      const resume = () => { if (document.visibilityState === 'visible') { publish(); void flush(); } };
      window.addEventListener('online', reconnect); window.addEventListener('offline', offline); document.addEventListener('visibilitychange', resume);
      const timer = window.setInterval(() => { publish(); void flush(); }, 30000);
      let updateTimer: ReturnType<typeof setTimeout>;
      const channel = supabase.channel('e3dady-changes').on('postgres_changes', { event: '*', schema: 'public' }, () => {
        clearTimeout(updateTimer); updateTimer = setTimeout(() => { void refresh(); }, 150);
      }).subscribe();
      try {
        broadcast = new BroadcastChannel('e3dady-mutations-v1');
        broadcast.onmessage = event => {
          const userId = data.userId;
          if (event.data?.userId !== userId || !userId) return;
          if (event.data.type === 'drafts') void offlineStorage.get<AttendanceDrafts>(`${userId}/drafts`).then(drafts => {
            if (data.userId === userId) set({ attendanceDrafts: drafts ?? {} });
          }).catch(report);
          else void readPending(userId).then(refresh);
        };
      } catch { /* Periodic refresh remains available. */ }
      return () => {
        stopped = true; generation++; authIdentity = undefined; auth.subscription.unsubscribe();
        if (supabase) void supabase.removeChannel(channel);
        window.removeEventListener('online', reconnect); window.removeEventListener('offline', offline); document.removeEventListener('visibilitychange', resume);
        clearInterval(timer); clearTimeout(updateTimer); broadcast?.close();
      };
    },
  };
}
export type AppStore = ReturnType<typeof createAppStore>;
export type AppState = ReturnType<AppStore['getSnapshot']>;
