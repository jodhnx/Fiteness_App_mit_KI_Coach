import {
  bindCacheOwner,
  getCached,
  hydratePersistentCaches,
  setCached,
  isCacheStale,
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
import { isNutritionDashboardToday, nutritionDayQueryString } from "@/lib/nutrition-day";
import {
  preferCanonicalNutritionDashboard,
  resolveNutritionDashboardForBoot,
  nutritionShellFromProfile,
} from "@/lib/nutrition-day-rollover";
import {
  mergeHomeEnrichment,
  normalizeHomeData,
  type HomeDataPayload,
} from "@/lib/home-defaults";
import { nutritionDashboardToHomeMacros } from "@/lib/nutrition-to-home";
import type { ProfileServerPrefetch } from "@/lib/profile-prefetch";
import { bootPerfMark, bootPerfReset } from "@/lib/app-init-perf";
import { commitHomeIntelligenceRefresh } from "@/lib/intelligence/client-refresh";
import { HOME_INSIGHTS_CACHE } from "@/lib/home-section-cache";
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

/** Until true, UI must treat zero targets as loading — never as "Kalorienziel festlegen". */
let bootSettled = false;

export function isBootSettled(): boolean {
  return bootSettled;
}

export function markBootSettled(value = true) {
  bootSettled = value;
}

/** Lightweight profile from boot home — no extra DB round-trip. */
export function profileStubFromBoot(
  home: HomeDataPayload,
  nutrition: NutritionDashboardPayload
): ProfileServerPrefetch {
  const targets = nutrition.targets;
  return {
    user: {
      name: home.userName ?? null,
      image: home.userImage ?? null,
    },
    profile:
      home.weightKg != null || home.weightGoal?.targetKg != null
        ? {
            weightKg: home.weightKg,
            targetWeightKg: home.weightGoal?.targetKg ?? null,
          }
        : null,
    calculations:
      targets && targets.calories > 0
        ? {
            bmi: 0,
            calorieTarget: targets.calories,
            proteinTargetG: targets.proteinG,
            carbsTargetG: targets.carbsG,
            fatTargetG: targets.fatG,
            recommendedTrainingDays: 3,
          }
        : null,
  };
}

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

function isNutritionBootReady(
  dash: NutritionDashboardPayload | null,
  opts?: { allowStaleDate?: boolean }
): boolean {
  if (!dash || !isValidDashboardPayload(dash)) return false;
  if (!opts?.allowStaleDate && !isNutritionDashboardToday(dash.date)) {
    return false;
  }
  if (dash.profileComplete && !hasNutritionTargets(dash)) return false;
  return true;
}

export function readBootPayloadFromCache(): BootstrapPayload | null {
  const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, { allowStale: true });
  const profile = getCached<ProfileServerPrefetch>(PROFILE_CACHE_KEY, { allowStale: true });
  const nutritionRaw =
    getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY, {
      allowStale: true,
    }) ??
    (home?.nutrition && isValidDashboardPayload(home.nutrition)
      ? home.nutrition
      : null);
  let nutrition = resolveNutritionDashboardForBoot(nutritionRaw);
  if (!nutrition) {
    nutrition = nutritionShellFromProfile(profile);
  }
  const progress = getCached(PROGRESS_CACHE_KEY, { allowStale: true });

  if (!nutrition || !isNutritionBootReady(nutrition, { allowStaleDate: true })) {
    return null;
  }

  // Overnight: home day-key miss is OK if we still have targets (+ optional identity).
  const cachedHome = home;
  const baseHome =
    cachedHome && isHomeBootReady(cachedHome)
      ? cachedHome
      : normalizeHomeData({
          ...(cachedHome && typeof cachedHome === "object" ? cachedHome : {}),
          ...nutritionDashboardToHomeMacros(nutrition),
          nutrition,
          userName:
            (cachedHome && "userName" in cachedHome
              ? (cachedHome as HomeDataPayload).userName
              : null) ??
            profile?.user?.name ??
            null,
          userImage:
            (cachedHome && "userImage" in cachedHome
              ? (cachedHome as HomeDataPayload).userImage
              : null) ??
            profile?.user?.image ??
            null,
          weightKg:
            (cachedHome && "weightKg" in cachedHome
              ? (cachedHome as HomeDataPayload).weightKg
              : null) ??
            (typeof profile?.profile?.weightKg === "number"
              ? profile.profile.weightKg
              : null),
        });

  if (!isHomeBootReady(baseHome) && (nutrition.targets?.calories ?? 0) <= 0) {
    return null;
  }

  const mergedHome = normalizeHomeData({
    ...baseHome,
    ...nutritionDashboardToHomeMacros(nutrition),
    nutrition,
    userName: baseHome.userName ?? profile?.user?.name ?? null,
    userImage: baseHome.userImage ?? profile?.user?.image ?? null,
    weightKg:
      baseHome.weightKg ??
      (typeof profile?.profile?.weightKg === "number"
        ? profile.profile.weightKg
        : null),
  });

  const resolvedProfile =
    profile ?? profileStubFromBoot(mergedHome, normalizeNutritionDashboard(nutrition));

  return {
    home: mergedHome,
    nutrition: normalizeNutritionDashboard(nutrition),
    profile: resolvedProfile,
    progress: progress ?? null,
  };
}

export function isAppBootReady(): boolean {
  return readBootPayloadFromCache() != null;
}

function isRichProfileCache(
  cached: ProfileServerPrefetch | null | undefined
): boolean {
  const p = cached?.profile as Record<string, unknown> | null | undefined;
  if (!p) return false;
  return Boolean(
    p.age != null ||
      p.heightCm != null ||
      p.calorieTarget != null ||
      p.activityLevel != null
  );
}

/** Merge boot stub into PROFILE cache without wiping a fuller /api/profile payload. */
function mergeProfileCacheFromBoot(incoming: ProfileServerPrefetch) {
  const existing = getCached<ProfileServerPrefetch>(PROFILE_CACHE_KEY, {
    allowStale: true,
  });
  if (!existing || !isRichProfileCache(existing)) {
    setCached(PROFILE_CACHE_KEY, incoming, 7 * 24 * 60 * 60_000);
    return;
  }

  const existingProfile = (existing.profile ?? {}) as Record<string, unknown>;
  const incomingProfile = (incoming.profile ?? {}) as Record<string, unknown>;
  const mergedProfile: Record<string, unknown> = { ...existingProfile };
  for (const [k, v] of Object.entries(incomingProfile)) {
    if (v != null && v !== "") mergedProfile[k] = v;
  }

  setCached(
    PROFILE_CACHE_KEY,
    {
      ...existing,
      ...incoming,
      user: { ...(existing.user ?? {}), ...(incoming.user ?? {}) },
      profile: mergedProfile,
      calculations: existing.calculations ?? incoming.calculations ?? null,
    },
    7 * 24 * 60 * 60_000
  );
}

function applyBootstrapPayload(payload: BootstrapPayload) {
  bootPerfMark("home_apply_start");
  const nutrition = preferCanonicalNutritionDashboard(payload.nutrition, null);
  const home = normalizeHomeData({
    ...payload.home,
    ...nutritionDashboardToHomeMacros(nutrition),
    nutrition,
  });
  // 7d hard TTL on disk — overnight reopen stays instant
  setCached(HOME_DATA_CACHE_KEY, home, 7 * 24 * 60 * 60_000);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(HOME_DATA_EVENT, { detail: home }));
  }
  bootPerfMark("home_apply_end");

  bootPerfMark("nutrition_apply_end");
  publishNutritionDashboard(nutrition);

  if (payload.profile?.user || payload.profile?.profile) {
    mergeProfileCacheFromBoot(payload.profile);
    bootPerfMark("profile_apply_end");
  } else {
    const stub = profileStubFromBoot(home, nutrition);
    if (stub.user?.name || stub.user?.image || stub.profile) {
      mergeProfileCacheFromBoot(stub);
      bootPerfMark("profile_apply_end");
    }
  }

  if (payload.progress) {
    setCached(PROGRESS_CACHE_KEY, payload.progress, 6 * 60 * 60_000);
    bootPerfMark("progress_apply_end");
  }

  setCached(BOOT_READY_KEY, { at: Date.now() }, 12 * 60 * 60_000);
  bootPerfMark("boot_ready");
}

let bootstrapInflight: Promise<BootstrapPayload | null> | null = null;
let bootstrapGen = 0;

async function fetchBootstrap(gen: number): Promise<BootstrapPayload | null> {
  bootPerfMark("bootstrap_start");
  try {
    const res = await fetchWithTimeout(
      `/api/bootstrap?${nutritionDayQueryString()}`,
      { credentials: "same-origin" },
      8_000
    );
    const body = await res.json().catch(() => null);
    if (gen !== bootstrapGen) return null;
    if (!res.ok || !body || typeof body !== "object") return null;

    const home = (body as { home?: HomeDataPayload }).home;
    const nutrition =
      (body as { nutrition?: NutritionDashboardPayload }).nutrition ??
      home?.nutrition ??
      null;
    const profile = (body as { profile?: ProfileServerPrefetch }).profile ?? null;
    const progress = (body as { progress?: unknown }).progress ?? null;

    if (!isHomeBootReady(home ?? null) || !nutrition || !isNutritionBootReady(nutrition, { allowStaleDate: true })) {
      return null;
    }

    const canonical = preferCanonicalNutritionDashboard(nutrition, null);
    if (gen !== bootstrapGen) return null;
    return {
      home: normalizeHomeData({
        ...home!,
        ...nutritionDashboardToHomeMacros(canonical),
        nutrition: canonical,
      }),
      nutrition: canonical,
      profile: profile ?? profileStubFromBoot(home!, canonical),
      progress,
    };
  } catch (e) {
    console.error("[initializeApp] bootstrap failed", e);
    return null;
  } finally {
    bootPerfMark("bootstrap_end");
  }
}

/** One in-flight /api/bootstrap — login warm + initializeApp share it. */
export function fetchBootstrapShared(opts?: {
  force?: boolean;
}): Promise<BootstrapPayload | null> {
  if (opts?.force) {
    bootstrapGen += 1;
    bootstrapInflight = null;
  }
  if (bootstrapInflight) return bootstrapInflight;
  const gen = bootstrapGen;
  const pending = fetchBootstrap(gen);
  bootstrapInflight = pending;
  void pending.finally(() => {
    if (bootstrapInflight === pending) bootstrapInflight = null;
  });
  return pending;
}

export { applyBootstrapPayload };

/** Enrich home with extras (gamification, recovery, …) without reloading nutrition. */
let enrichInflight: Promise<void> | null = null;

export function enrichHomeInBackground() {
  if (typeof window === "undefined") return;

  const current = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, {
    allowStale: true,
  });
  if (
    current?.weeklyIntelligence &&
    current?.adaptiveRecommendations &&
    !isCacheStale(HOME_INSIGHTS_CACHE, 0.85)
  ) {
    return;
  }

  if (enrichInflight) return;

  enrichInflight = fetch("/api/home?enrich=1", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((extras: Record<string, unknown> | null) => {
      if (!extras || typeof extras !== "object") return;
      const base = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, {
        allowStale: true,
      });
      if (!base) return;
      const merged = mergeHomeEnrichment(base, extras);
      const next = commitHomeIntelligenceRefresh(merged);
      setCached(HOME_DATA_CACHE_KEY, next, 900_000);
      window.dispatchEvent(new CustomEvent(HOME_DATA_EVENT, { detail: next }));
    })
    .catch(() => {})
    .finally(() => {
      enrichInflight = null;
    });
}

/**
 * Cache-first boot. Home already paints; this refreshes in the background.
 * Warm path: disk/memory. Cold path: one shared /api/bootstrap round-trip.
 */
export async function initializeApp(
  userId: string,
  _onProgress?: (p: number) => void
): Promise<AppInitResult> {
  bootPerfReset();
  bootSettled = false;
  bootPerfMark("cache_hydrate_start");
  bindCacheOwner(userId);
  hydratePersistentCaches(userId);
  bootPerfMark("cache_hydrate_end");

  try {
    const cached = readBootPayloadFromCache();
    if (cached) {
      applyBootstrapPayload(cached);
      // Cached paint is ready — UI may show targets; background refresh continues.
      bootSettled = true;
      void fetchBootstrapShared().then((fresh) => {
        if (fresh) applyBootstrapPayload(fresh);
        enrichHomeInBackground();
        bootSettled = true;
      });
      return { payload: cached, fromCache: true };
    }

    const fresh = await fetchBootstrapShared();
    if (fresh) {
      applyBootstrapPayload(fresh);
      enrichHomeInBackground();
      return { payload: fresh, fromCache: false };
    }

    return { payload: null, fromCache: false };
  } finally {
    bootSettled = true;
  }
}
