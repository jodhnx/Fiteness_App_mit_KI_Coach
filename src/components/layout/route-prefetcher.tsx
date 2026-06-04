"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Nur Next.js-Routen — keine API-Calls (verhindert DB-Stau beim Start). */
const HOME_FIRST = "/home";
const DEFERRED_NAV = ["/workouts", "/nutrition", "/activities", "/coach"] as const;

export function RoutePrefetcher() {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    router.prefetch(HOME_FIRST);
    const idle =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 400);
    idle(() => {
      for (const href of DEFERRED_NAV) {
        router.prefetch(href);
      }
    });
  }, [router]);

  return null;
}
