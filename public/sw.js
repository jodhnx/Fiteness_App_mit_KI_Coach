/* NEXFORM — SW intentionally inert.
 * Previous versions cached navigations / stale assets and caused
 * ChunkLoadError → global "Unerwarteter Fehler" after deploys.
 * Keep file so old registrations can update to this no-op, then unregister.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("nexform-") || k.startsWith("workbox-"))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});

// Do not intercept any fetch — never serve stale JS/HTML.
