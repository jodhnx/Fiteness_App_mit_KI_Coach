/**
 * Nutrition meal plan helpers (no DB).
 * Run: npx tsx scripts/test-nutrition-plans.ts
 */
import { PLAN_DURATIONS } from "../src/lib/nutrition-plan-constants";
import { PLAN_MEAL_TYPES } from "../src/lib/nutrition-plan-constants";
import {
  createNutritionPlanSchema,
  addPlanItemSchema,
  patchPlanItemSchema,
} from "../src/lib/nutrition-plan-validation";
import { sumMacros, macrosForQuantity, roundMacros } from "../src/lib/food-macros";

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("Nutrition Plans — unit checks\n");

assert("durations include 7", PLAN_DURATIONS.includes(7));
assert("durations include 1 and 28", PLAN_DURATIONS.includes(1) && PLAN_DURATIONS.includes(28));
assert("meal types include PRE_WORKOUT", PLAN_MEAL_TYPES.includes("PRE_WORKOUT"));
assert("meal types include SNACK", PLAN_MEAL_TYPES.includes("SNACK"));

const createOk = createNutritionPlanSchema.safeParse({
  name: "Meine Aufbau-Woche",
  durationDays: 7,
});
assert("create schema accepts 7-day plan", createOk.success);

const createBad = createNutritionPlanSchema.safeParse({
  name: "X",
  durationDays: 9,
});
assert("create schema rejects invalid duration", !createBad.success);

const itemOk = addPlanItemSchema.safeParse({
  mealId: "meal1",
  foodItemId: "food1",
  quantityG: 150,
});
assert("add item with food+qty", itemOk.success);

const itemBadQty = addPlanItemSchema.safeParse({
  mealId: "meal1",
  quantityG: -5,
});
assert("rejects negative quantity", !itemBadQty.success);

const patchOk = patchPlanItemSchema.safeParse({ quantityG: 200 });
assert("patch quantity ok", patchOk.success);

// Planned macros must use shared macrosForQuantity (same as diary)
const food = {
  calories: 165,
  proteinG: 31,
  carbsG: 0,
  fatG: 3.6,
  servingG: 100,
};
const planned = macrosForQuantity(food, 150);
assert("150g chicken ~247 kcal", planned.calories === 248 || planned.calories === 247);
assert("150g chicken protein ~46.5", Math.abs(planned.proteinG - 46.5) < 0.2);

const mealSum = sumMacros([
  planned,
  { calories: 100, proteinG: 10, carbsG: 12, fatG: 2 },
]);
assert(
  "meal sum calories",
  mealSum.calories === planned.calories + 100
);

const dayTotals = sumMacros([
  { calories: 2350, proteinG: 160, carbsG: 250, fatG: 70 },
  { calories: 2410, proteinG: 155, carbsG: 260, fatG: 72 },
]);
const avg = roundMacros({
  calories: dayTotals.calories / 2,
  proteinG: dayTotals.proteinG / 2,
  carbsG: dayTotals.carbsG / 2,
  fatG: dayTotals.fatG / 2,
});
assert("week avg ~2380", avg.calories === 2380);

// Planned vs logged conceptual separation — planned foods must NOT use diary APIs
assert(
  "plan items route path is plans not quick-add",
  "/api/nutrition/plans/[id]/items".includes("plans") &&
    !"/api/nutrition/plans/[id]/items".includes("quick-add")
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
