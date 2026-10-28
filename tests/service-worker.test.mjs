import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
const worker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
function harness() {
  const origin = 'https://e3dady.test', handlers = new Map(), stores = new Map();
  let version = 'one', online = true, chunkFailure = false;
  const key = request => new URL(typeof request === 'string' ? request : request.url, origin).href;
  const fetchMock = async request => {
    if (!online) throw new Error('offline');
    const url = key(request);
    if (url.endsWith('/precache-manifest.json')) return Response.json({ version, assets: [`/_next/static/${version}.js`] });
    if (chunkFailure && url.endsWith('/two.js')) throw new Error('chunk unavailable');
    return new Response(url.endsWith('/') ? `shell-${version}` : `chunk-${version}`);
  };
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const items = stores.get(name);
      return {
        async match(request) { return items.get(key(request))?.clone(); },
        async put(request, response) { items.set(key(request), response.clone()); },
        async add(request) { const response = await fetchMock(request); if (!response.ok) throw new Error('bad response'); items.set(key(request), response); },
      };
    },
    async match(request) { for (const items of stores.values()) if (items.has(key(request))) return items.get(key(request)).clone(); },
    async keys() { return [...stores.keys()]; }, async delete(name) { return stores.delete(name); },
  };
  const BrowserRequest = class { constructor(url) { this.url = new URL(url, origin).href; } };
  vm.runInNewContext(worker, { self: { location: { origin }, addEventListener: (name, handler) => handlers.set(name, handler), skipWaiting: async () => {}, clients: { claim: async () => {} } },
    fetch: fetchMock, caches, Request: BrowserRequest, Response, URL, Set, Promise, Error });
  async function dispatch(name, request) {
    const waits = []; let response;
    handlers.get(name)({ request, waitUntil: promise => waits.push(promise), respondWith: promise => { response = promise; } });
    const result = response ? await response : undefined;
    await Promise.all(waits);
    return result;
  }
  return { dispatch, stores, setVersion: value => { version = value; }, setOnline: value => { online = value; }, failChunk: value => { chunkFailure = value; },
    navigate: () => dispatch('fetch', { url: origin + '/', method: 'GET', mode: 'navigate' }) };
}
test('service worker serves fresh navigation online and a complete cached build offline', async () => {
  const app = harness();
  await app.dispatch('install');
  assert.equal(await (await app.navigate()).text(), 'shell-one');
  app.setOnline(false);
  assert.equal(await (await app.navigate()).text(), 'shell-one');
});
test('an incomplete deployment cannot replace the last complete offline shell', async () => {
  const app = harness(); await app.dispatch('install');
  app.setVersion('two'); app.failChunk(true);
  assert.equal(await (await app.navigate()).text(), 'shell-two');
  app.setOnline(false);
  assert.equal(await (await app.navigate()).text(), 'shell-one');
  app.setOnline(true); app.failChunk(false); await app.navigate();
  app.setOnline(false);
  assert.equal(await (await app.navigate()).text(), 'shell-two');
});
test('private API and cross-origin requests are never cached by the worker', async () => {
  const app = harness(); await app.dispatch('install');
  assert.equal(await app.dispatch('fetch', { url: 'https://e3dady.test/rest/v1/youth', method: 'GET', mode: 'cors' }), undefined);
  assert.equal(await app.dispatch('fetch', { url: 'https://supabase.test/rest/v1/youth', method: 'GET', mode: 'cors' }), undefined);
});
