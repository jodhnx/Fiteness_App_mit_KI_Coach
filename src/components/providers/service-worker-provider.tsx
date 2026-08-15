"use client";

import { useEffect } from "react";

/**
 * Registers SW for offline API cache only.
 * On update: activate immediately and drop old caches so nav never hits stale chunks.
 */
export function ServiceWorkerProvider() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return;

    let cancelled = false;

    void (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (cancelled) return;

        // Force activate waiting worker (new SW version)
        if (reg.waiting) {
          reg.waiting.postMessage?.({ type: "SKIP_WAITING" });
        }

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              // New version ready — clients.claim in activate handles it
            }
          });
        });

        // Purge ancient cache names from older SW versions
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter(
                (k) =>
                  k.startsWith("nexform-") &&
                  k !== "nexform-offline-v3" &&
                  k !== "nexform-api-v3"
              )
              .map((k) => caches.delete(k))
          );
        }
      } catch {
        /* SW optional */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
