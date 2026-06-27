"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { warmNavDataCaches } from "@/lib/nav-cache-warmer";
import { warmTrainingCaches } from "@/lib/cache-manager";
import { hydratePersistentCaches } from "@/lib/client-cache";

/** Reihenfolge = Hauptmenü: Home → Training → Ernährung → Fortschritt → Coach */
const NAV_ROUTES = [
  "/home",
  "/workouts",
  "/nutrition",
  "/progress",
  "/coach",
  "/erfolge",
  "/settings",
] as const;

export function RoutePrefetcher() {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    hydratePersistentCaches();

    for (const href of NAV_ROUTES.slice(0, 5)) {
      router.prefetch(href);
    }
    warmNavDataCaches();
    warmTrainingCaches();

    const idle =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 150);

    idle(() => {
      for (const href of NAV_ROUTES.slice(5)) {
        router.prefetch(href);
      }
    });
  }, [router]);

  return null;
}
