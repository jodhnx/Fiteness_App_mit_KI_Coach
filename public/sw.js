/* NEXFORM offline shell — caches Home & Progress API responses for offline read. */
const CACHE = "nexform-offline-v1";
const API_CACHE = "nexform-api-v1";
const OFFLINE_APIS = ["/api/home", "/api/progress", "/api/nutrition/dashboard"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/home", "/manifest.webmanifest"]).catch(() => undefined)
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("nexform-") && k !== CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isOfflineApi = OFFLINE_APIS.some((p) => url.pathname === p);

  if (isOfflineApi) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.open(API_CACHE).then((cache) => cache.match(request)).then(
            (cached) =>
              cached ??
              new Response(JSON.stringify({ offline: true, error: "Offline" }), {
                status: 503,
                headers: { "Content-Type": "application/json" },
              })
          )
        )
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.open(CACHE).then((cache) => cache.match("/home"))
      )
    );
  }
});
