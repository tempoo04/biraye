/* BirAye service worker — DISABLED (self-cleaning kill switch).
 *
 * During active development we don't want any cached app code: every load
 * should come straight from the server, like a normal website. Browsers always
 * re-check this file, so shipping this version makes any device that still has
 * an old (cache-first) worker tear it down automatically — no manual step.
 *
 * A real offline/installable worker can be reintroduced once the app stabilizes.
 */
"use strict";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => c.navigate(c.url)); // reload to fresh, worker-free
    })()
  );
});
