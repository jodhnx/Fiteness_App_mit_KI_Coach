import {
  bindCacheOwner,
  getCached,
  hydratePersistentCaches,
  setCached,
} from "@/lib/client-cache";
import {
  publishNutritionDashboard,
  HOME_DATA_CACHE_KEY,
  HOME_DATA_EVENT,
  NUTRITION_DASHBOARD_CACHE_KEY,
  PROFILE_CACHE_KEY,
} from "@/lib/nutrition-sync";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import {
  hasNutritionTargets,
  isValidDashboardPayload,
  normalizeNutritionDashboard,
  type NutritionDashboardPayload,
} from "@/lib/nutrition-defaults";
import { isNutritionDashboardToday } from "@/lib/nutrition-day";
import { normalizeHomeData, type HomeDataPayload } from "@/lib/home-defaults";
import type { ProfileServerPrefetch } from "@/lib/profile-prefetch";
import { bootPerfMark, bootPerfReset } from "@/lib/app-init-perf";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

export const BOOT_READY_KEY = "boot-ready-v1";

export type BootstrapPayload = {
  home: HomeDataPayload;
  nutrition: NutritionDashboardPayload;
  profile: ProfileServerPrefetch | null;
  progress: unknown;
};

export type AppInitResult = {
  payload: BootstrapPayload | null;
  fromCache: boolean;
};

function isHomeBootReady(home: HomeDataPayload | null): home is HomeDataPayload {
  if (!home) return false;
  return (
    typeof home.calorieTarget === "number" &&
    typeof home.caloriesIntake === "number" &&
    "userName" in home &&
    "userImage" in home &&
    "nextWorkout" in home &&
    "weightKg" in home
  );
}

function isNutritionBootReady(dash: NutritionDashboardPayload | null): boolean {
  if (!dash || !isValidDashboardPayload(dash) || !isNutritionDashboardToday(dash.date)) {
    return false;
  }
  if (dash.profileComplete && !hasNutritionTargets(dash)) return false;
  return true;
}

export function readBootPayloadFromCache(): BootstrapPayload | null {
  const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, { allowStale: true });
  const nutrition = getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY, {
    allowStale: true,
  });
  const profile = getCached<ProfileServerPrefetch>(PROFILE_CACHE_KEY, { allowStale: true });
  const progress = getCached(PROGRESS_CACHE_KEY, { allowStale: true });

  if (!isHomeBootReady(home) || !isNutritionBootReady(nutrition)) return null;

  return {
    home: normalizeHomeData(home),
    nutrition: normalizeNutritionDashboard(nutrition),
    profile: profile ?? null,
    progress: progress ?? null,
  };
}

export function isAppBootReady(): boolean {
  return readBootPayloadFromCache() != null;
}

function applyBootstrapPayload(payload: BootstrapPayload) {
  bootPerfMark("home_apply_start");
  const home = normalizeHomeData(payload.home);
  setCached(HOME_DATA_CACHE_KEY, home, 900_000);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(HOME_DATA_EVENT, { detail: home }));
  }
  bootPerfMark("home_apply_end");

  bootPerfMark("nutrition_apply_end");
  publishNutritionDashboard(normalizeNutritionDashboard(payload.nutrition));

  if (payload.profile?.user || payload.profile?.profile) {
    setCached(PROFILE_CACHE_KEY, payload.profile, 900_000);
    bootPerfMark("profile_apply_end");
  }

  if (payload.progress) {
    setCached(PROGRESS_CACHE_KEY, payload.progress, 600_000);
    bootPerfMark("progress_apply_end");
  }

  setCached(BOOT_READY_KEY, { at: Date.now() }, 900_000);
  bootPerfMark("boot_ready");
}

async function fetchBootstrap(): Promise<BootstrapPayload | null> {
  bootPerfMark("bootstrap_start");
  try {
    const res = await fetchWithTimeout(
      "/api/bootstrap",
      { credentials: "same-origin" },
      12_000
    );
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || typeof body !== "object") return null;

    const home = (body as { home?: HomeDataPayload }).home;
    const nutrition =
      (body as { nutrition?: NutritionDashboardPayload }).nutrition ??
      home?.nutrition ??
      null;
    const profile = (body as { profile?: ProfileServerPrefetch }).profile ?? null;
    const progress = (body as { progress?: unknown }).progress ?? null;

    if (!isHomeBootReady(home ?? null) || !nutrition || !isNutritionBootReady(nutrition)) {
      return null;
    }

    return {
      home: normalizeHomeData(home!),
      nutrition: normalizeNutritionDashboard(nutrition),
      profile,
      progress,
    };
  } catch (e) {
    console.error("[initializeApp] bootstrap failed", e);
    return null;
  } finally {
    bootPerfMark("bootstrap_end");
  }
}

/** Enrich home with full payload (gamification, recovery, …) without blocking boot. */
export function enrichHomeInBackground() {
  if (typeof window === "undefined") return;
  void fetch("/api/home", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((home: HomeDataPayload | null) => {
      if (!home || typeof home !== "object") return;
      const normalized = normalizeHomeData(home);
      setCached(HOME_DATA_CACHE_KEY, normalized, 900_000);
      window.dispatchEvent(new CustomEvent(HOME_DATA_EVENT, { detail: normalized }));
    })
    .catch(() => {});
}

/**
 * Central app initialization — MUST complete before Home is shown.
 * Warm path: instant from disk/memory cache.
 * Cold path: single /api/bootstrap round-trip (no post-render Home fetch).
 */
export async function initializeApp(userId: string): Promise<AppInitResult> {
  bootPerfReset();
  bootPerfMark("cache_hydrate_start");
  bindCacheOwner(userId);
  hydratePersistentCaches(userId);
  bootPerfMark("cache_hydrate_end");

  const cached = readBootPayloadFromCache();
  if (cached) {
    applyBootstrapPayload(cached);
    void fetchBootstrap().then((fresh) => {
      if (fresh) applyBootstrapPayload(fresh);
      enrichHomeInBackground();
    });
    return { payload: cached, fromCache: true };
  }

  const fresh = await fetchBootstrap();
  if (fresh) {
    applyBootstrapPayload(fresh);
    enrichHomeInBackground();
    return { payload: fresh, fromCache: false };
  }

  return { payload: null, fromCache: false };
}
