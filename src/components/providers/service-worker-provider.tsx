"use client";

import { useEffect } from "react";

/**
 * Removes legacy service workers / caches that served stale Next.js chunks
 * and caused "Unerwarteter Fehler" on menu switches after deploys.
 * Offline API caching is disabled until a safe SW strategy exists.
 */
export function ServiceWorkerProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    void (async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((k) => k.startsWith("nexform-") || k.startsWith("workbox-"))
              .map((k) => caches.delete(k))
          );
        }
      } catch (e) {
        console.warn("[sw] cleanup failed", e);
      }
    })();
  }, []);

  return null;
}
