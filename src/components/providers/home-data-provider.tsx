"use client";

import { useEffect, type ReactNode } from "react";
import { setCached } from "@/lib/client-cache";
import { HOME_DATA_CACHE_KEY, HOME_DATA_EVENT } from "@/lib/nutrition-sync";
import { normalizeHomeData, type HomeDataPayload } from "@/lib/home-defaults";

function seedHomeCache(initial: HomeDataPayload | null) {
  if (!initial) return;
  const normalized = normalizeHomeData(initial);
  // Always apply SSR/home payload for the current user (overwrite stale cache)
  setCached(HOME_DATA_CACHE_KEY, normalized, 120_000);
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
  useEffect(() => {
    seedHomeCache(initialHome);
  }, [initialHome]);

  return children;
}
