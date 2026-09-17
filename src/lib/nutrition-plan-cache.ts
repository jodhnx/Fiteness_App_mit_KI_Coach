import { getCached, setCached, invalidateCache } from "@/lib/client-cache";
import type { PlanDetailDto, PlanListItemDto } from "@/lib/nutrition-plan-types";

export const NUTRITION_PLANS_LIST_KEY = "nutrition-plans-list";
export const nutritionPlanCacheKey = (id: string) => `nutrition-plan:${id}`;

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

export function invalidateNutritionPlanCaches(planId?: string) {
  invalidateCache(NUTRITION_PLANS_LIST_KEY);
  if (planId) invalidateCache(nutritionPlanCacheKey(planId));
}
