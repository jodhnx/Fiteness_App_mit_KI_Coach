"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { warmNavDataCaches } from "@/lib/nav-cache-warmer";
import { warmTrainingCaches } from "@/lib/cache-manager";
import { warmHealthSync } from "@/lib/health-sync-warmer";

/** Reihenfolge = Hauptmenü: Home → Training → Ernährung → Fortschritt → Mehr */
const NAV_ROUTES = [
  "/home",
  "/workouts",
  "/nutrition",
  "/progress",
  "/more",
  "/coach",
  "/social",
  "/erfolge",
  "/geraete",
  "/settings",
  "/rezepte",
] as const;

export function RoutePrefetcher() {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    // Hydration of account caches is handled by SessionCacheGuard
    // once the authenticated userId is known — never hydrate blindly.

    for (const href of NAV_ROUTES.slice(0, 5)) {
      router.prefetch(href);
    }

    const idle =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 400);

    idle(() => {
      // warmNavDataCaches is also scheduled post-boot — flag makes this a no-op if already run
      warmNavDataCaches();
    });

    // Secondary hubs much later — don't contend with Home/Nutrition first paint
    window.setTimeout(() => {
      idle(() => {
        for (const href of NAV_ROUTES.slice(5, 8)) {
          router.prefetch(href);
        }
        warmTrainingCaches();
      });
    }, 5000);

    window.setTimeout(() => {
      idle(() => {
        for (const href of NAV_ROUTES.slice(8)) {
          router.prefetch(href);
        }
        warmHealthSync();
      });
    }, 9000);
  }, [router]);

  return null;
}
