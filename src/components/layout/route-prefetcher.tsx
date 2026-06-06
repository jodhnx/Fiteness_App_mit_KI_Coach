"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Next.js-Routen vorladen — keine API-Calls (verhindert DB-Stau beim Start). */
const IMMEDIATE = ["/home", "/workouts", "/nutrition"] as const;
const DEFERRED = ["/activities", "/coach", "/progress", "/erfolge", "/settings"] as const;

export function RoutePrefetcher() {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    for (const href of IMMEDIATE) {
      router.prefetch(href);
    }

    const idle =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 200);

    idle(() => {
      for (const href of DEFERRED) {
        router.prefetch(href);
      }
    });
  }, [router]);

  return null;
}
