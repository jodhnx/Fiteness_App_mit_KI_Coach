"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Nur Next.js-Routen — keine API-Calls (verhindert DB-Stau beim Start). */
const FAST_NAV_ROUTES = [
  "/home",
  "/nutrition",
  "/workouts",
  "/activities",
] as const;

export function RoutePrefetcher() {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    for (const href of FAST_NAV_ROUTES) {
      router.prefetch(href);
    }
  }, [router]);

  return null;
}
