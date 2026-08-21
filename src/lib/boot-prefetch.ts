import { setCached } from "@/lib/client-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import { prefetchProgressCharts } from "@/lib/progress-chart-prefetch";
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

/** Secondary parallel prefetch after critical home data is ready. */
export function runBootSecondaryPrefetch() {
  if (typeof window === "undefined") return;

  void Promise.all([
    fetchOk("/api/workouts/sessions?active=1"),
    fetchOk("/api/workouts/recovery"),
    fetchOk("/api/workouts/plans"),
    fetchOk("/api/gamification"),
    fetchOk("/api/social/feed"),
  ]).then(([active, recovery, plans, gamification, feed]) => {
    if (active) setCached("workouts-active", active, 180_000);
    if (recovery) setCached("workouts-recovery-hub", recovery, 120_000);
    if (plans) setCached("workouts-my-plans-hub", plans, 120_000);
    if (gamification) setCached("gamification-full", gamification, 120_000);
    if (feed) setCached("social-feed", feed, 120_000);
  });

  // Community + devices in background (lower priority)
  void Promise.all([
    fetchOk("/api/social/friends"),
    fetchOk("/api/challenges"),
    fetchOk("/api/social/leaderboard?metric=workouts"),
    fetchOk("/api/wearables"),
    fetchOk("/api/health/dashboard"),
    fetchOk("/api/profile"),
    fetchOk("/api/food/history"),
  ]).then(([friends, challenges, ranks, wearables, health, profile, foodHistory]) => {
    if (friends) setCached("social-friends", friends, 120_000);
    if (challenges) setCached("social-challenges", challenges, 120_000);
    if (ranks) setCached("social-ranks-workouts", ranks, 120_000);
    if (wearables) setCached("wearables-list", wearables, 120_000);
    if (health) setCached("health-dashboard", health, 90_000);
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
      const { writeRecipeCatalogCache } = await import("@/lib/recipe-catalog-cache");
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

  void prefetchProgressCharts();
}

export const BOOT_CACHE_KEYS = {
  home: HOME_DATA_CACHE_KEY,
  nutrition: NUTRITION_DASHBOARD_CACHE_KEY,
  profile: PROFILE_CACHE_KEY,
  progress: PROGRESS_CACHE_KEY,
} as const;
