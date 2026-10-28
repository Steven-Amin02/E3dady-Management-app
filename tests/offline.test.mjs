import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { source } from './load-source.mjs';
const { offlineStorage: storage } = source('src/lib/offlineStorage.ts');
const { replayOutbox, operationKey } = source('src/lib/outbox.ts');
const { allPages } = source('src/lib/repository.ts');
const op = (id, userId = 'account-a') => ({ id, userId, actorId: 's', queuedAt: new Date().toISOString(), kind: 'attendance', changes: [], auditCategory: '', auditNotes: '' });

test('IndexedDB acknowledges committed writes and concurrent draft updates are atomic', async () => {
  await storage.set('test/draft', {});
  await Promise.all(Array.from({ length: 20 }, (_, i) => storage.mutate('test/draft', value => ({ value: { ...value, [i]: i }, result: null }))));
  assert.equal(Object.keys(await storage.get('test/draft')).length, 20);
});
test('moving a draft to the outbox commits both changes together', async () => {
  const operation = op('atomic', 'atomic-account');
  await storage.set('atomic/drafts', { date: { a: 'present' } });
  await storage.mutate('atomic/drafts', previous => ({ value: {}, result: previous, also: [[operationKey(operation), operation]] }));
  assert.deepEqual(await storage.get('atomic/drafts'), {});
  assert.equal((await storage.get(operationKey(operation))).id, 'atomic');
});
test('a failed draft transaction changes neither the draft nor the outbox', async () => {
  await storage.set('rollback/drafts', { a: 'present' });
  await assert.rejects(storage.mutate('rollback/drafts', () => { throw new Error('storage failure'); }));
  assert.deepEqual(await storage.get('rollback/drafts'), { a: 'present' });
});
test('offline retry preserves operations and only removes them after server acknowledgement', async () => {
  const operation = op('retry', 'retry-account');
  await storage.set(operationKey(operation), operation);
  await replayOutbox('retry-account', storage, async () => { throw new Error('network unavailable'); });
  assert.equal((await storage.get(operationKey(operation))).blocked, false);
  await replayOutbox('retry-account', storage, async () => {});
  assert.equal(await storage.get(operationKey(operation)), undefined);
});
test('conflicts remain blocked and do not automatically overwrite another user change', async () => {
  const operation = op('conflict', 'conflict-account');
  await storage.set(operationKey(operation), operation);
  await replayOutbox('conflict-account', storage, async () => { throw { code: '40001', message: 'conflict' }; });
  assert.equal((await storage.get(operationKey(operation))).blocked, true);
  let called = false;
  await replayOutbox('conflict-account', storage, async () => { called = true; });
  assert.equal(called, false);
});
test('outbox replay is scoped to the authenticated account', async () => {
  await storage.set(operationKey(op('private', 'other-account')), op('private', 'other-account'));
  await replayOutbox('empty-account', storage, async () => assert.fail('sent another account operation'));
  assert.ok(await storage.get(operationKey(op('private', 'other-account'))));
});
test('pagination retrieves complete results beyond 500 and propagates query errors', async () => {
  const data = Array.from({ length: 1204 }, (_, id) => ({ id }));
  const result = await allPages((from, to) => Promise.resolve({ data: data.slice(from, to + 1), error: null }));
  assert.equal(result.length, 1204);
  await assert.rejects(allPages(async () => ({ data: null, error: new Error('permission denied') })), /permission denied/);
});
