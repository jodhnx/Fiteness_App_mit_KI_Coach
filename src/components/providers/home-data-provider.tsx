"use client";

import { useRef, type ReactNode } from "react";
import { setCached } from "@/lib/client-cache";
import { HOME_DATA_CACHE_KEY, HOME_DATA_EVENT } from "@/lib/nutrition-sync";
import { normalizeHomeData, type HomeDataPayload } from "@/lib/home-defaults";

function seedHomeCache(initial: HomeDataPayload) {
  const normalized = normalizeHomeData(initial);
  setCached(HOME_DATA_CACHE_KEY, normalized, 900_000);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(HOME_DATA_EVENT, { detail: normalized })
    );
  }
}

export function HomeDataProvider({
  initialHome,
  children,
}: {
  initialHome: HomeDataPayload | null;
  children: ReactNode;
}) {
  const seededKey = useRef<string | null>(null);
  if (initialHome) {
    const key = `${initialHome.caloriesIntake ?? 0}-${initialHome.userName ?? ""}`;
    if (seededKey.current !== key) {
      seedHomeCache(initialHome);
      seededKey.current = key;
    }
  }
  return children;
}
