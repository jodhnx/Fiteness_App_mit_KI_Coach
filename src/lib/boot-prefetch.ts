import { setCached } from "@/lib/client-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import {
  HOME_DATA_CACHE_KEY,
  NUTRITION_DASHBOARD_CACHE_KEY,
  PROFILE_CACHE_KEY,
} from "@/lib/nutrition-sync";

async function fetchOk(url: string) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) return null;
  return res.json();
}

function afterIdle(cb: () => void, timeoutMs = 2500) {
  if (typeof window === "undefined") return;
  const ric = window.requestIdleCallback;
  if (typeof ric === "function") {
    ric(() => cb(), { timeout: timeoutMs });
  } else {
    window.setTimeout(cb, Math.min(800, timeoutMs));
  }
}

/**
 * Low-priority background warm — NEVER blocks Home paint.
 * Only food history + active session: highest UX impact, no social/recipe waterfalls.
 */
export function runBootSecondaryPrefetch() {
  if (typeof window === "undefined") return;

  afterIdle(() => {
    void fetchOk("/api/food/history").then((foodHistory) => {
      if (!foodHistory) return;
      const rec = (foodHistory.recents ?? []) as unknown[];
      setCached(
        "food-history",
        {
          frequent: (foodHistory.frequent ?? rec).slice(0, 12),
          recents: rec.slice(0, 12),
          favorites: (foodHistory.favorites ?? []).slice(0, 40),
        },
        7 * 24 * 60 * 60_000
      );
    });
  }, 800);

  window.setTimeout(() => {
    afterIdle(() => {
      void fetchOk("/api/workouts/sessions?active=1").then((active) => {
        if (active) setCached("workouts-active", active, 180_000);
      });
    });
  }, 1500);
}

export const BOOT_CACHE_KEYS = {
  home: HOME_DATA_CACHE_KEY,
  nutrition: NUTRITION_DASHBOARD_CACHE_KEY,
  profile: PROFILE_CACHE_KEY,
  progress: PROGRESS_CACHE_KEY,
} as const;
