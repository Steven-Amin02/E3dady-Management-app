import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { source, replaceSource } from './load-source.mjs';

const callbacks = new Set();
let activeUser, server, networkError = false, sendCount = 0, snapshotGate;
let rangeCalls = 0;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
globalThis.window = Object.assign(new EventTarget(), { setInterval: () => 1 });
globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
globalThis.localStorage = {};
globalThis.BroadcastChannel = class { postMessage() {} close() {} };
const client = {
  auth: {
    onAuthStateChange(callback) { callbacks.add(callback); return { data: { subscription: { unsubscribe: () => callbacks.delete(callback) } } }; },
    async getSession() { return { data: { session: { user: { id: activeUser } } }, error: null }; },
    async signOut() { for (const callback of callbacks) callback('SIGNED_OUT', null); return { error: null }; },
  },
  channel() { return { on() { return this; }, subscribe() { return this; } }; }, removeChannel() {},
};
replaceSource('src/lib/supabase.ts', { supabase: client, isSupabaseConfigured: true });
const { serviceDate, precedingFriday } = source('src/lib/serviceDate.ts');
const { emptySnapshot } = source('src/lib/repository.ts');
replaceSource('src/lib/repository.ts', {
  emptySnapshot, requireClient: () => client,
  async fetchSnapshot() { if (!navigator.onLine) throw new Error('offline'); const snapshot = structuredClone(server); if (snapshotGate) await snapshotGate.promise; return snapshot; },
  async fetchSession(date) { return structuredClone(server.attendance.filter(a => a.session_date === date)); },
  async fetchAttendanceRange(start, end) { rangeCalls++; return structuredClone(server.attendance.filter(a => a.session_date >= start && a.session_date <= end)); },
  async sendOperation(op) {
    if (networkError) throw new Error('network interrupted');
    sendCount++;
    for (const change of op.changes ?? []) {
      const index = server.attendance.findIndex(a => a.youth_id === change.youth_id && a.session_date === change.session_date);
      if (change.status === null) { if (index >= 0) server.attendance.splice(index, 1); }
      else {
        const row = { ...change, id: randomUUID(), recorded_by: op.actorId, version: (server.attendance[index]?.version ?? 0) + 1 };
        if (index >= 0) server.attendance[index] = row; else server.attendance.push(row);
      }
    }
  },
});
const { createAppStore } = source('src/lib/appStore.ts');
const date = precedingFriday(serviceDate(), true);
function fixture(userId) {
  const servant = { id: `s-${userId}`, auth_user_id: userId, role: 'admin', name: 'Synthetic', phone: '' };
  return { ...emptySnapshot(), servants: [servant], youth: ['a', 'b'].map(id => ({ id, name: id, phone: '', school_year: '1st Prep', notes: '', assigned_servant_id: servant.id })),
    tasks: [{ id: 'task', servant_id: servant.id, youth_id: 'a', task_date: serviceDate(), completed_at: null }] };
}
async function until(condition) {
  for (let i = 0; i < 200; i++) { if (condition()) return; await new Promise(resolve => setTimeout(resolve, 2)); }
  throw new Error('Store did not reach expected state');
}
async function start(userId = randomUUID()) {
  activeUser = userId; navigator.onLine = true; server = fixture(userId); networkError = false; sendCount = 0; snapshotGate = undefined; rangeCalls = 0;
  const store = createAppStore(), stop = store.start();
  await until(() => store.getSnapshot().status === 'online');
  await new Promise(resolve => setTimeout(resolve, 10));
  return { store, stop, userId };
}
test('authenticated empty state never falls back to a bundled directory', async () => {
  const { store, stop } = await start();
  try { server.youth = []; server.tasks = []; await store.getSnapshot().refresh(); assert.deepEqual(store.getSnapshot().youth, []); }
  finally { stop(); }
});
test('remote updates cannot overwrite a saved draft or change its base version', async () => {
  const { store, stop } = await start();
  try {
    await store.getSnapshot().editAttendance(date, { a: 'present' });
    server.attendance = [{ id: 'remote', youth_id: 'b', session_date: date, status: 'absent', version: 1 }];
    await store.getSnapshot().refresh();
    assert.equal(store.getSnapshot().attendanceDrafts[date].a.status, 'present');
    assert.equal(store.getSnapshot().attendanceDrafts[date].a.expected_version, null);
  } finally { stop(); }
});
test('offline save survives a new store instance and replays on reconnect', async () => {
  const { store, stop, userId } = await start();
  let secondStop;
  try {
    await store.getSnapshot().editAttendance(date, { a: 'present' });
    navigator.onLine = false;
    const result = await store.getSnapshot().saveAttendance(date);
    assert.equal(result.cloudSynced, false);
    assert.equal(store.getSnapshot().pendingOperations.length, 1);
    assert.equal(store.getSnapshot().attendance[0].pending, true);
    const second = createAppStore(); secondStop = second.start();
    await until(() => second.getSnapshot().status === 'offline');
    assert.equal(second.getSnapshot().userId, userId);
    assert.equal(second.getSnapshot().pendingOperations.length, 1);
    assert.equal(second.getSnapshot().attendance[0].status, 'present');
    navigator.onLine = true;
    await second.getSnapshot().retrySync();
    assert.equal(second.getSnapshot().pendingOperations.length, 0);
    assert.equal(server.attendance[0].status, 'present');
    assert.equal(sendCount, 1);
  } finally { stop(); secondStop?.(); navigator.onLine = true; }
});
test('two tabs persist edits without losing each other draft entries', async () => {
  const { store, stop } = await start();
  const other = createAppStore(), otherStop = other.start();
  try {
    await until(() => other.getSnapshot().status === 'online');
    await Promise.all([store.getSnapshot().editAttendance(date, { a: 'present' }), other.getSnapshot().editAttendance(date, { b: 'absent' })]);
    navigator.onLine = false;
    await store.getSnapshot().saveAttendance(date);
    const operation = store.getSnapshot().pendingOperations[0];
    assert.equal(operation.changes.length, 2);
    assert.deepEqual(new Set(operation.changes.map(c => c.youth_id)), new Set(['a', 'b']));
  } finally { stop(); otherStop(); navigator.onLine = true; }
});
test('a rejected or interrupted request remains pending and is not reported as cloud synced', async () => {
  const { store, stop } = await start();
  try {
    networkError = true;
    await store.getSnapshot().editAttendance(date, { a: 'absent' });
    const result = await store.getSnapshot().saveAttendance(date);
    assert.equal(result.cloudSynced, false);
    assert.equal(store.getSnapshot().pendingOperations.length, 1);
    assert.equal(server.attendance.length, 0);
    await assert.rejects(store.getSnapshot().signOut(), /./);
  } finally { stop(); }
});
test('opening historical attendance during a refresh cannot lose the loaded history window', async () => {
  const { store, stop } = await start();
  let release;
  try {
    snapshotGate = { promise: new Promise(resolve => { release = resolve; }) };
    const refreshing = store.getSnapshot().refresh();
    const history = store.getSnapshot().ensureSession('2025-09-05');
    await new Promise(resolve => setTimeout(resolve, 2));
    assert.equal(rangeCalls, 0);
    server.attendance.push({ id: 'historical', youth_id: 'a', session_date: '2025-09-05', status: 'present', version: 1 });
    snapshotGate = undefined; release();
    await refreshing; await history;
    assert.equal(store.getSnapshot().attendance.find(a => a.id === 'historical')?.status, 'present');
    assert.ok(store.getSnapshot().loadedSessionDates.includes('2025-09-05'));
  } finally { release?.(); stop(); }
});
