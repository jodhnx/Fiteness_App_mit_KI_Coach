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
 * Low-priority background warm — NEVER blocks splash / Home paint.
 * Staggered so the first frames stay free for Home interaction.
 */
export function runBootSecondaryPrefetch() {
  if (typeof window === "undefined") return;

  // Wave 1 (~1.5s): training + gamification (nav-adjacent)
  window.setTimeout(() => {
    afterIdle(() => {
      void Promise.all([
        fetchOk("/api/workouts/sessions?active=1"),
        fetchOk("/api/workouts/plans"),
        fetchOk("/api/gamification"),
      ]).then(([active, plans, gamification]) => {
        if (active) setCached("workouts-active", active, 180_000);
        if (plans) setCached("workouts-my-plans-hub", plans, 120_000);
        if (gamification) setCached("gamification-full", gamification, 120_000);
      });
    });
  }, 1500);

  // Wave 2 (~3.5s): community / devices / food history
  window.setTimeout(() => {
    afterIdle(() => {
      void Promise.all([
        fetchOk("/api/social/feed"),
        fetchOk("/api/wearables"),
        fetchOk("/api/food/history"),
        fetchOk("/api/profile"),
      ]).then(([feed, wearables, foodHistory, profile]) => {
        if (feed) setCached("social-feed", feed, 120_000);
        if (wearables) setCached("wearables-list", wearables, 120_000);
        if (profile) setCached(PROFILE_CACHE_KEY, profile, 120_000);
        if (foodHistory) {
          const rec = (foodHistory.recents ?? []) as unknown[];
          setCached(
            "food-history",
            {
              frequent: (foodHistory.frequent ?? rec).slice(0, 12),
              recents: rec.slice(0, 12),
              favorites: (foodHistory.favorites ?? []).slice(0, 40),
            },
            180_000
          );
        }
      });
    }, 3000);
  }, 3500);

  // Wave 3 (~5.5s): recipes + remaining social
  window.setTimeout(() => {
    afterIdle(() => {
      void fetchOk("/api/recipes/catalog?limit=24&page=1")
        .then(async (recipes) => {
          if (!recipes) return;
          const d = recipes as {
            recipes?: import("@/lib/recipes/catalog-query").RecipeListItem[];
            total?: number;
            catalogTotal?: number;
            page?: number;
            hasMore?: boolean;
            favoriteIds?: string[];
          };
          const { writeRecipeCatalogCache } = await import(
            "@/lib/recipe-catalog-cache"
          );
          writeRecipeCatalogCache({
            recipes: d.recipes ?? [],
            total: d.total ?? 0,
            catalogTotal: d.catalogTotal ?? d.total ?? 0,
            page: d.page ?? 1,
            hasMore: Boolean(d.hasMore),
            favoriteIds: d.favoriteIds ?? [],
            q: "",
            filters: [],
          });
        })
        .catch(() => {});

      void Promise.all([
        fetchOk("/api/social/friends"),
        fetchOk("/api/challenges"),
        fetchOk("/api/health/dashboard"),
      ]).then(([friends, challenges, health]) => {
        if (friends) setCached("social-friends", friends, 120_000);
        if (challenges) setCached("social-challenges", challenges, 120_000);
        if (health) setCached("health-dashboard", health, 90_000);
      });
    }, 4000);
  }, 5500);
}

export const BOOT_CACHE_KEYS = {
  home: HOME_DATA_CACHE_KEY,
  nutrition: NUTRITION_DASHBOARD_CACHE_KEY,
  profile: PROFILE_CACHE_KEY,
  progress: PROGRESS_CACHE_KEY,
} as const;
