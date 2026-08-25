"use client";

import { useEffect, useState } from "react";
import { getCached } from "@/lib/client-cache";
import {
  HOME_DATA_CACHE_KEY,
  HOME_DATA_EVENT,
  NUTRITION_DASHBOARD_EVENT,
  NUTRITION_DASHBOARD_CACHE_KEY,
  PROFILE_CACHE_KEY,
} from "@/lib/nutrition-sync";
import {
  createEmptyHomeData,
  normalizeHomeData,
  type HomeDataPayload,
} from "@/lib/home-defaults";
import { nutritionDashboardToHomeMacros } from "@/lib/nutrition-to-home";
import { buildHomeCoachFromNutrition } from "@/lib/nutrition-coach";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import {
  createEmptyNutritionDashboard,
  isValidDashboardPayload,
} from "@/lib/nutrition-defaults";
import { resolveNutritionDashboardForBoot } from "@/lib/nutrition-day-rollover";
import type { ProfileServerPrefetch } from "@/lib/profile-prefetch";
import { commitHomeIntelligenceRefresh } from "@/lib/intelligence/client-refresh";

function mergeHomeWithNutrition(
  home: HomeDataPayload,
  nutrition: NutritionDashboardPayload
): HomeDataPayload {
  const safe = isValidDashboardPayload(nutrition)
    ? nutrition
    : createEmptyNutritionDashboard();
  return commitHomeIntelligenceRefresh(
    normalizeHomeData({
      ...home,
      ...nutritionDashboardToHomeMacros(safe),
      nutrition: safe,
      coach: buildHomeCoachFromNutrition(safe),
    }),
    { nutrition: safe }
  );
}

function resolveBootHome(): HomeDataPayload {
  const cached = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, { allowStale: true });
  const nutritionRaw =
    getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY, {
      allowStale: true,
    }) ??
    (cached?.nutrition && isValidDashboardPayload(cached.nutrition)
      ? cached.nutrition
      : null);
  const nutrition = resolveNutritionDashboardForBoot(nutritionRaw);
  const profile = getCached<ProfileServerPrefetch>(PROFILE_CACHE_KEY, { allowStale: true });

  const base = normalizeHomeData(cached ?? createEmptyHomeData());
  const withIdentity = normalizeHomeData({
    ...base,
    userName: base.userName ?? profile?.user?.name ?? null,
    userImage: base.userImage ?? profile?.user?.image ?? null,
    weightKg: base.weightKg ?? profile?.profile?.weightKg ?? null,
    nutritionStreak: base.nutritionStreak ?? null,
  });

  if (nutrition) {
    return mergeHomeWithNutrition(withIdentity, nutrition);
  }
  return commitHomeIntelligenceRefresh(withIdentity);
}

/**
 * Home reads boot cache + live events only — never triggers /api/home on mount.
 * Background refresh is owned by initializeApp / enrichHomeInBackground.
 */
export function useBootHomeData(): HomeDataPayload {
  const [home, setHome] = useState<HomeDataPayload>(() => resolveBootHome());

  useEffect(() => {
    const onHome = (e: Event) => {
      const detail = (e as CustomEvent<HomeDataPayload>).detail;
      if (detail) {
        setHome(commitHomeIntelligenceRefresh(normalizeHomeData(detail)));
      }
    };
    const onNutrition = (e: Event) => {
      const nutrition = (e as CustomEvent<NutritionDashboardPayload>).detail;
      if (!nutrition || !isValidDashboardPayload(nutrition)) return;
      setHome((prev) => mergeHomeWithNutrition(prev, nutrition));
    };

    window.addEventListener(HOME_DATA_EVENT, onHome);
    window.addEventListener(NUTRITION_DASHBOARD_EVENT, onNutrition);
    return () => {
      window.removeEventListener(HOME_DATA_EVENT, onHome);
      window.removeEventListener(NUTRITION_DASHBOARD_EVENT, onNutrition);
    };
  }, []);

  return home;
}
