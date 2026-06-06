"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Hauptnavigation sofort vorladen — keine API-Calls. */
const ALL_MAIN = [
  "/home",
  "/workouts",
  "/progress",
  "/nutrition",
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

    for (const href of ALL_MAIN.slice(0, 5)) {
      router.prefetch(href);
    }

    const idle =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 150);

    idle(() => {
      for (const href of ALL_MAIN.slice(5)) {
        router.prefetch(href);
      }
    });
  }, [router]);

  return null;
}
