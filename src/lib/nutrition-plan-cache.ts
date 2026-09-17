import { getCached, setCached, invalidateCache, isCacheStale } from "@/lib/client-cache";
import type {
  ActivePlanSummaryDto,
  PlanDetailDto,
  PlanListItemDto,
} from "@/lib/nutrition-plan-types";

export const NUTRITION_PLANS_LIST_KEY = "nutrition-plans-list";
export const NUTRITION_ACTIVE_PLAN_KEY = "nutrition-active-plan";
export const ACTIVE_NUTRITION_PLAN_EVENT = "nutrition-active-plan-updated";

export const nutritionPlanCacheKey = (id: string) => `nutrition-plan:${id}`;

/** Wrapper so "no active plan" is distinguishable from cache miss. */
export type ActivePlanCacheEntry = {
  active: ActivePlanSummaryDto | null;
};

export function readPlansListCache(): PlanListItemDto[] | null {
  return getCached<PlanListItemDto[]>(NUTRITION_PLANS_LIST_KEY, {
    allowStale: true,
  });
}

export function writePlansListCache(list: PlanListItemDto[]) {
  setCached(NUTRITION_PLANS_LIST_KEY, list, 300_000);
}

export function readPlanCache(id: string): PlanDetailDto | null {
  return getCached<PlanDetailDto>(nutritionPlanCacheKey(id), {
    allowStale: true,
  });
}

export function writePlanCache(plan: PlanDetailDto) {
  setCached(nutritionPlanCacheKey(plan.id), plan, 300_000);
}

export function readActivePlanCache(): ActivePlanCacheEntry | null {
  return getCached<ActivePlanCacheEntry>(NUTRITION_ACTIVE_PLAN_KEY, {
    allowStale: true,
  });
}

export function writeActivePlanCache(active: ActivePlanSummaryDto | null) {
  const entry: ActivePlanCacheEntry = { active };
  // Longer TTL — bootstrap + card; mutations invalidate explicitly
  setCached(NUTRITION_ACTIVE_PLAN_KEY, entry, 6 * 60 * 60_000);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(ACTIVE_NUTRITION_PLAN_EVENT, { detail: entry })
    );
  }
}

export function invalidateNutritionPlanCaches(planId?: string) {
  invalidateCache(NUTRITION_PLANS_LIST_KEY);
  if (planId) invalidateCache(nutritionPlanCacheKey(planId));
}

/** Call on activate / archive / delete — not on every item edit. */
export function invalidateActiveNutritionPlanCache() {
  invalidateCache(NUTRITION_ACTIVE_PLAN_KEY);
}

/** Keep dashboard card in sync after editing the active plan (no full wipe). */
export function syncActivePlanSummaryFromDetail(plan: PlanDetailDto) {
  if (!plan.isActive) return;
  const today = new Date();
  let currentDayNumber = 1;
  if (plan.startDate) {
    const start = new Date(plan.startDate);
    const diff = Math.floor(
      (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
        Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
        86_400_000
    );
    currentDayNumber = Math.min(
      plan.durationDays,
      Math.max(1, diff + 1)
    );
  } else {
    const withItems = plan.days.find((d) => d.itemCount > 0);
    currentDayNumber = withItems?.dayNumber ?? 1;
  }
  const day =
    plan.days.find((d) => d.dayNumber === currentDayNumber) ?? plan.days[0];
  writeActivePlanCache({
    id: plan.id,
    name: plan.name,
    durationDays: plan.durationDays,
    currentDayNumber,
    totals: {
      calories: day?.totals.calories ?? 0,
      proteinG: day?.totals.proteinG ?? 0,
      carbsG: day?.totals.carbsG ?? 0,
      fatG: day?.totals.fatG ?? 0,
    },
    targetCalories: plan.targetCalories,
    targetProteinG: plan.targetProteinG,
  });
}

/** Background: refresh active summary + prefetch current plan detail. */
export function warmActiveNutritionPlanCaches() {
  if (typeof window === "undefined") return;

  const refreshSummary = isCacheStale(NUTRITION_ACTIVE_PLAN_KEY, 0.85);
  const existing = readActivePlanCache();

  const runSummary = () => {
    void fetch("/api/nutrition/plans/active", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          active: ActivePlanSummaryDto | null;
        };
        writeActivePlanCache(data.active ?? null);
        if (data.active?.id && !readPlanCache(data.active.id)) {
          void prefetchPlanDetail(data.active.id);
        }
      })
      .catch(() => {});
  };

  if (refreshSummary || !existing) {
    runSummary();
  } else if (existing.active?.id && !readPlanCache(existing.active.id)) {
    void prefetchPlanDetail(existing.active.id);
  }
}

function prefetchPlanDetail(planId: string) {
  return fetch(`/api/nutrition/plans/${planId}`, { credentials: "include" })
    .then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as { plan: PlanDetailDto };
      if (data.plan) writePlanCache(data.plan);
    })
    .catch(() => {});
}
