import { setCached, invalidateCache, getCached } from "@/lib/client-cache";
import {
  type NutritionDashboardPayload,
  isValidDashboardPayload,
  createEmptyNutritionDashboard,
} from "@/lib/nutrition-defaults";
import { nutritionDashboardToHomeMacros } from "@/lib/nutrition-to-home";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { createEmptyHomeData } from "@/lib/home-defaults";
import { hydrateHomeSectionCaches, HOME_HEUTE_CACHE, HOME_COACH_CACHE, HOME_INSIGHTS_CACHE, HOME_WORKOUT_CACHE } from "@/lib/home-section-cache";

/** Single source of truth for daily nutrition numbers */
export const NUTRITION_DASHBOARD_CACHE_KEY = "nutrition-dashboard";
export const NUTRITION_SUMMARY_CACHE_KEY = "nutrition-summary";
export const HOME_DATA_CACHE_KEY = "home-data";
export const PROFILE_CACHE_KEY = "profile-data";

export const NUTRITION_DASHBOARD_EVENT = "nutrition-dashboard-updated";

export type NutritionSummaryPayload = {
  nutrition: NutritionDashboardPayload;
};

export function invalidateAllNutritionCaches() {
  invalidateCache(NUTRITION_DASHBOARD_CACHE_KEY);
  invalidateCache(NUTRITION_SUMMARY_CACHE_KEY);
  invalidateCache(HOME_DATA_CACHE_KEY);
  invalidateCache(HOME_HEUTE_CACHE);
  invalidateCache(HOME_COACH_CACHE);
  invalidateCache(HOME_INSIGHTS_CACHE);
  invalidateCache(HOME_WORKOUT_CACHE);
  invalidateCache("nutrition-coach");
}

/** Push fresh dashboard to all client caches + notify mounted pages */
export function publishNutritionDashboard(dashboard: NutritionDashboardPayload) {
  const nutrition = isValidDashboardPayload(dashboard)
    ? dashboard
    : createEmptyNutritionDashboard();

  const summary: NutritionSummaryPayload = { nutrition };
  const ttl = 60_000;

  setCached(NUTRITION_DASHBOARD_CACHE_KEY, nutrition, ttl);
  setCached(NUTRITION_SUMMARY_CACHE_KEY, summary, ttl);

  const prevHome = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
  const macroSlice = nutritionDashboardToHomeMacros(nutrition);
  setCached(
    HOME_DATA_CACHE_KEY,
    {
      ...(prevHome ?? createEmptyHomeData()),
      ...macroSlice,
    },
    ttl
  );

  hydrateHomeSectionCaches({
    ...(prevHome ?? createEmptyHomeData()),
    ...macroSlice,
    nutrition,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(NUTRITION_DASHBOARD_EVENT, { detail: nutrition })
    );
  }
}

export function buildSummaryFromDashboard(
  dashboard: NutritionDashboardPayload
): NutritionSummaryPayload {
  return {
    nutrition: isValidDashboardPayload(dashboard)
      ? dashboard
      : createEmptyNutritionDashboard(),
  };
}

/** After quick-add / delete — instant sync without refetch */
export async function applyNutritionMutationResponse(
  res: Response
): Promise<NutritionDashboardPayload | null> {
  try {
    const body = await res.json();
    if (body?.dashboard && isValidDashboardPayload(body.dashboard)) {
      publishNutritionDashboard(body.dashboard);
      return body.dashboard;
    }
  } catch {
    /* ignore */
  }
  return null;
}
