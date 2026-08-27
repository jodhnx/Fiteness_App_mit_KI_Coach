/**
 * Nutrition display state + meal delete consistency tests.
 * Run: npx tsx scripts/test-nutrition-display.ts
 */

import {
  getCalorieDisplay,
  resolveNutritionDisplayState,
  computeNutritionRemaining,
} from "../src/lib/nutrition-display";
import { createEmptyNutritionDashboard } from "../src/lib/nutrition-defaults";
import { optimisticRemoveMeal } from "../src/lib/nutrition-sync";

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

console.log("Nutrition Display Tests\n");

// 1. Normal remaining
{
  const cal = getCalorieDisplay(1760, 3000, 1240);
  assert("1240 kcal übrig", cal.primaryValue === 1240 && !cal.isOver);
  assert("secondary gegessen von", cal.secondaryLine.includes("1.760 gegessen von 3.000"));
}

// 2. Over target — never negative remaining
{
  const cal = getCalorieDisplay(3180, 3000, 0);
  assert("180 über dem Ziel", cal.primaryValue === 180 && cal.isOver);
  assert("label über dem Ziel", cal.primaryLabel === "kcal über dem Ziel");
}

// 3. Zero consumed, full budget
{
  const cal = getCalorieDisplay(0, 3000, 3000);
  assert("3000 übrig bei 0 gegessen", cal.primaryValue === 3000 && cal.remaining === 3000);
}

// 4. Missing target — not "0 übrig" in UI state
{
  const dash = createEmptyNutritionDashboard();
  const state = resolveNutritionDisplayState(dash);
  assert("missing_target when no goal", state.kind === "missing_target");
}

// 5. Loading state
{
  const state = resolveNutritionDisplayState(null, { loading: true });
  assert("loading when null", state.kind === "loading");
}

// 6. Ready with target
{
  const dash = createEmptyNutritionDashboard();
  dash.targets.calories = 2500;
  dash.targets.proteinG = 150;
  dash.consumed.calories = 500;
  dash.remaining.calories = 2000;
  const state = resolveNutritionDisplayState(dash);
  assert("ready when target set", state.kind === "ready");
  if (state.kind === "ready") {
    assert("ready remaining", state.cal.remaining === 2000);
  }
}

// 7. Exercise burned in optimistic remaining
{
  const dash = createEmptyNutritionDashboard();
  dash.targets.calories = 3000;
  dash.consumed.calories = 2200;
  dash.exerciseBurned = { calories: 200, estimated: false };
  const rem = computeNutritionRemaining(dash);
  assert("remaining includes burned", rem.calories === 1000);
}

// 8. Meal delete optimistic
{
  const dash = createEmptyNutritionDashboard();
  dash.targets.calories = 3000;
  dash.targets.proteinG = 200;
  dash.consumed.calories = 2200;
  dash.consumed.proteinG = 190;
  dash.remaining.calories = 800;
  dash.remaining.proteinG = 10;
  dash.mealsByType = dash.mealsByType.map((slot, i) =>
    i === 0
      ? {
          ...slot,
          mealId: "meal-1",
          totals: { calories: 600, proteinG: 50, carbsG: 0, fatG: 0 },
          items: [
            {
              id: "item-1",
              quantityG: 100,
              food: { name: "Test" },
              calories: 600,
              proteinG: 50,
            },
          ],
        }
      : slot
  );
  const next = optimisticRemoveMeal(dash, "meal-1");
  assert("delete meal reduces consumed", next != null && next.consumed.calories === 1600);
  assert("delete meal increases remaining", next != null && next.remaining.calories === 1400);
  assert("delete meal reduces protein", next != null && next.consumed.proteinG === 140);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
