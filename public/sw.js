/* Only the public application shell is cached here. Private records live in account-scoped IndexedDB. */
const SHELL_CACHE = 'e3dady-shell-v4';
const STATIC_PREFIX = 'e3dady-static-v4-';
const POINTER = '/__e3dady_shell_version';
let warming;
async function cachedShell() {
  const pointer = await (await caches.open(SHELL_CACHE)).match(POINTER);
  if (!pointer) return Response.error();
  return (await (await caches.open(STATIC_PREFIX + await pointer.text())).match('/')) || Response.error();
}
function warmShell() {
  if (warming) return warming;
  warming = (async () => {
    const response = await fetch('/precache-manifest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Build manifest unavailable');
    const manifest = await response.json();
    if (typeof manifest.version !== 'string' || !Array.isArray(manifest.assets)) throw new Error('Invalid build manifest');
    const metadata = await caches.open(SHELL_CACHE);
    const oldPointer = await metadata.match(POINTER);
    const previous = oldPointer ? await oldPointer.text() : '';
    const cache = await caches.open(STATIC_PREFIX + manifest.version);
    await Promise.all(manifest.assets.map(async asset => {
      if (typeof asset !== 'string' || !asset.startsWith('/') || asset.startsWith('//')) throw new Error('Invalid asset path');
      if (!await cache.match(asset)) await cache.add(new Request(asset, { cache: 'reload' }));
    }));
    const home = await fetch('/', { cache: 'no-store' });
    if (!home.ok) throw new Error('Application shell unavailable');
    await cache.put('/', home);
    // Publish the offline shell only after all its versioned chunks are durable.
    await metadata.put(POINTER, new Response(manifest.version));
    const keep = new Set([SHELL_CACHE, STATIC_PREFIX + manifest.version, STATIC_PREFIX + previous]);
    await Promise.all((await caches.keys()).filter(key => key.startsWith('e3dady-') && !keep.has(key)).map(key => caches.delete(key)));
  })().finally(() => { warming = undefined; });
  return warming;
}
self.addEventListener('install', event => {
  event.waitUntil(warmShell().then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.waitUntil(warmShell().catch(() => {}));
    event.respondWith(fetch(request).catch(cachedShell));
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
  }
});
