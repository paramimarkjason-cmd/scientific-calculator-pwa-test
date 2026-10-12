'use strict';
// Generated SHA-256 asset inventory follows. Regenerate after any packaged asset change.
const RELEASE = 'phase2-pwa-v1';
const CACHE = 'scientific-calculator-shell-' + RELEASE;
const ASSETS = {
    "index.html":  "ae76bdff3aab63cadc9af2a2d6c993d5d803e0ab8c74824c88e6f62a78b930d2",
    "manifest.webmanifest":  "099cee2b8c49b013cfaca816d7dd2d63b437277f2ec0b19e0389df69b1cef5a4",
    "assets/pwa-bootstrap.js":  "c1576b3a3c99fef0fbfbb488731484a7f856ecc0d5cd4d1ea701533223ab9af5",
    "assets/icons/icon-192.png":  "5a53651ce902f41f319f98e7b47e1ab82af3e08e9e8d6a5d20c2511df8358366",
    "assets/icons/icon-512.png":  "1dbcd473244a313788c8214f7b6d64f36d03adf1fc994171317262e0fe966aff",
    "assets/icons/icon-maskable-512.png":  "1dbcd473244a313788c8214f7b6d64f36d03adf1fc994171317262e0fe966aff",
    "assets/icons/apple-touch-icon-180.png":  "9a8a15d8540a50f30500b53312ba20aecb823c089ee2103b63e525633e1afb68"
};
const ROOT = new URL('./', self.location.href);
const assetURLs = new Map(Object.entries(ASSETS || {}).map(([path, hash]) => [new URL(path, ROOT).href, hash]));
async function matches(response, expected) {
  if (!response || !response.ok || response.type === 'opaque' || response.redirected) return false;
  const digest = await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer());
  const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return actual === expected;
}
async function verifyCache() {
  if (!ASSETS || !await caches.has(CACHE)) return false;
  const cache = await caches.open(CACHE);
  for (const [url, hash] of assetURLs) {
    if (!await matches(await cache.match(url), hash)) return false;
  }
  return true;
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    if (!ASSETS) throw new Error('Missing asset inventory');
    // Fetch and verify the complete release before writing it to the release cache.
    const verified = [];
    for (const [url, hash] of assetURLs) {
      const response = await fetch(url, {cache: 'no-store', credentials: 'same-origin', redirect: 'error'});
      if (!await matches(response, hash)) throw new Error('Asset integrity check failed: ' + url);
      verified.push([url, response]);
    }
    const cache = await caches.open(CACHE);
    for (const [url, response] of verified) await cache.put(url, response);
    if (!await verifyCache()) throw new Error('Offline cache verification failed');
    // No skipWaiting: updated releases wait for existing controlled pages to close.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    if (!await verifyCache()) throw new Error('Incomplete offline release');
    // Claim only initially uncontrolled pages. No reload and no database/cache cleanup.
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  let assetURL = url.href;
  if (url.origin === ROOT.origin && url.pathname === ROOT.pathname && !url.search) assetURL = new URL('index.html', ROOT).href;
  if (url.origin !== ROOT.origin || request.method !== 'GET' || !assetURLs.has(assetURL)) {
    event.respondWith(Promise.resolve(Response.error()));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const response = await cache.match(assetURL);
    if (!await matches(response, assetURLs.get(assetURL))) return Response.error();
    return response;
  })());
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'VERIFY_CACHE' && event.ports[0]) {
    event.waitUntil((async () => {
      let ready = false;
      try { ready = await verifyCache(); } catch (_) { /* fail closed for readiness */ }
      event.ports[0].postMessage({type: 'CACHE_STATUS', release: RELEASE, ready});
    })());
  }
});
