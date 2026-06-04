/* BirAye service worker — offline app shell + cached Quran data.
 *
 * Strategy:
 *   - app shell (same-origin GET for "/", /static/*) : cache-first
 *   - API data   (/api/*)                            : stale-while-revalidate
 *   - audio CDN  (cross-origin)                       : network passthrough
 */
"use strict";

const VERSION = "biraye-v1";
const SHELL = [
  "/",
  "/static/app.js",
  "/static/style.css",
  "/static/manifest.webmanifest",
  "/static/icon-192.png",
  "/static/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // cross-origin (audio CDN, fonts): let the network handle it
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) (await caches.open(VERSION)).put(request, res.clone());
    return res;
  } catch (err) {
    // navigation fallback to the cached app shell
    const shell = await caches.match("/");
    if (shell) return shell;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}
