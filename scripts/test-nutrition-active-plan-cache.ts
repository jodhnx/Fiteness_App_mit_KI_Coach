/**
 * Active nutrition plan cache + account isolation (no DB).
 * Run: npx tsx scripts/test-nutrition-active-plan-cache.ts
 */
import {
  bindCacheOwner,
  getCached,
  invalidateCache,
} from "../src/lib/client-cache";
import {
  NUTRITION_ACTIVE_PLAN_KEY,
  writeActivePlanCache,
  readActivePlanCache,
  invalidateActiveNutritionPlanCache,
  syncActivePlanSummaryFromDetail,
  writePlanCache,
  readPlanCache,
} from "../src/lib/nutrition-plan-cache";
import type { PlanDetailDto } from "../src/lib/nutrition-plan-types";
import { PERSISTENT_CACHE_KEYS } from "../src/lib/persistent-cache";

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
}

console.log("Active nutrition plan cache\n");

assert(
  "active plan is disk-persisted",
  (PERSISTENT_CACHE_KEYS as readonly string[]).includes("nutrition-active-plan")
);

bindCacheOwner("plan-user-a");
invalidateCache();

writeActivePlanCache({
  id: "plan-1",
  name: "Aufbau",
  durationDays: 7,
  currentDayNumber: 3,
  totals: { calories: 2340, proteinG: 158 },
  targetCalories: 2400,
  targetProteinG: 160,
});

const a = readActivePlanCache();
assert("user A reads active plan", a?.active?.id === "plan-1");
assert("explicit none distinguishable", a != null && a.active != null);

writeActivePlanCache(null);
assert("none sentinel stored", readActivePlanCache()?.active === null);

invalidateCache();
bindCacheOwner("plan-user-b");
assert("user B does not see user A plan", readActivePlanCache() == null);

writeActivePlanCache({
  id: "plan-b",
  name: "Cut",
  durationDays: 5,
  currentDayNumber: 1,
  totals: { calories: 1800, proteinG: 140 },
  targetCalories: 1900,
  targetProteinG: 150,
});
assert("user B own plan", readActivePlanCache()?.active?.id === "plan-b");

invalidateActiveNutritionPlanCache();
assert(
  "invalidate clears active only",
  getCached(NUTRITION_ACTIVE_PLAN_KEY, { allowStale: true }) == null
);

const stubPlan = {
  id: "plan-sync",
  name: "Sync",
  description: null,
  durationDays: 7,
  startDate: null,
  status: "ACTIVE" as const,
  isActive: true,
  targetCalories: 2400,
  targetProteinG: 160,
  targetCarbsG: 280,
  targetFatG: 70,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  days: [
    {
      id: "d1",
      dayNumber: 1,
      date: null,
      meals: [],
      totals: { calories: 2100, proteinG: 150, carbsG: 250, fatG: 60 },
      mealCount: 0,
      itemCount: 2,
    },
  ],
  weekAverage: { calories: 2100, proteinG: 150, carbsG: 250, fatG: 60 },
  totalMeals: 0,
  totalItems: 2,
} satisfies PlanDetailDto;

bindCacheOwner("plan-user-sync");
syncActivePlanSummaryFromDetail(stubPlan);
assert(
  "sync from detail updates card cache",
  readActivePlanCache()?.active?.totals.calories === 2100
);

writePlanCache(stubPlan);
assert("plan detail cache written", readPlanCache("plan-sync")?.name === "Sync");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
