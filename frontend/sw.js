/* BirAye service worker — offline app shell.
 *
 * Caching strategy, chosen so an online device never sees stale code while an
 * offline device still gets a working app shell:
 *
 *   - navigations + app code (html / app.js / i18n.js / style.css):
 *       network-first, falling back to cache when offline.
 *   - static assets (fonts, icons, logo, manifest): cache-first (immutable).
 *   - /api GET requests: network-first, falling back to the last cached
 *       response so previously-opened surahs still load offline.
 *   - everything else (e.g. cross-origin recitation audio): passthrough to the
 *       network — audio is large and streamed, so it is not cached.
 *
 * Bump VERSION to invalidate every cache on the next activation.
 */
"use strict";

const VERSION = "v2";
const SHELL_CACHE = `biraye-shell-${VERSION}`;
const ASSET_CACHE = `biraye-assets-${VERSION}`;
const API_CACHE = `biraye-api-${VERSION}`;
const CURRENT = [SHELL_CACHE, ASSET_CACHE, API_CACHE];

// The minimum needed to boot offline. "/" is the navigation entry point.
const SHELL = ["/", "/static/app.js", "/static/i18n.js", "/static/style.css"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !CURRENT.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, cacheName, fallbackKey) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(request);
    if (resp && resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch (err) {
    const cached = (await cache.match(request)) || (fallbackKey && (await cache.match(fallbackKey)));
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const resp = await fetch(request);
  if (resp && resp.ok) cache.put(request, resp.clone());
  return resp;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Navigations: network-first, fall back to the cached shell ("/") offline.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL_CACHE, "/"));
    return;
  }

  // Cross-origin (recitation audio, etc.): let the browser handle it directly.
  if (url.origin !== self.location.origin) return;

  // App code: network-first so fresh code always wins when online.
  if (/\/static\/(app|i18n)\.js$/.test(url.pathname) || url.pathname === "/static/style.css") {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  // API: network-first, keep the last good response for offline re-opens.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Static immutable assets (fonts, icons, logo, manifest): cache-first.
  if (url.pathname.startsWith("/static/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }
});
