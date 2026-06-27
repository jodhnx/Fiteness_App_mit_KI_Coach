"use client";

import { useEffect } from "react";

/** Registers the offline service worker on app start. */
export function ServiceWorkerProvider() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        /* SW optional — app works without it */
      });
  }, []);

  return null;
}
