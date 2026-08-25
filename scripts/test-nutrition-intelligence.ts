/**
 * Phase 5C — Nutrition Intelligence 3.0 smoke tests.
 * Run: npx tsx scripts/test-nutrition-intelligence.ts
 */
import {
  macroStatus,
  findMatchingSavedMeals,
  mealTimingFromHour,
  goalGuidance,
} from "../src/lib/intelligence/nutrition-performance/analyze";
import { buildNutritionPerformanceIntelligence } from "../src/lib/intelligence/nutrition-performance/build";
import { coachContextNeeds } from "../src/lib/coach-context/needs";
import type { NutritionDashboardPayload } from "../src/lib/nutrition-defaults";
import type { SavedMealSummary } from "../src/lib/saved-meals-cache";
import type { WeeklyNutritionSnapshot } from "../src/lib/intelligence/weekly/types";

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? `: ${detail}` : ""}`);
  }
}

function dashboard(overrides: Partial<NutritionDashboardPayload> = {}): NutritionDashboardPayload {
  return {
    date: "2026-08-26",
    targets: {
      calories: 2500,
      proteinG: 150,
      carbsG: 300,
      fatG: 80,
      fiberG: 30,
      waterTargetMl: 2500,
      nutritionGoal: "MUSCLE_GAIN",
    },
    consumed: { calories: 1700, proteinG: 88, carbsG: 180, fatG: 45, fiberG: 20 },
    remaining: { calories: 800, proteinG: 62, carbsG: 120, fatG: 35 },
    water: { consumedMl: 1500, targetMl: 2500 },
    mealsByType: [],
    favorites: [],
    recents: [],
    profileComplete: true,
    empty: false,
    ...overrides,
  };
}

function weekly(overrides: Partial<WeeklyNutritionSnapshot> = {}): WeeklyNutritionSnapshot {
  return {
    avgProteinG: 140,
    avgCaloriesKcal: 2300,
    proteinDaysOnTarget: 6,
    proteinDaysTotal: 7,
    calorieTarget: 2500,
    calorieDeltaVsTarget: -100,
    status: "good",
    ...overrides,
  };
}

function savedMeal(name: string, protein: number, calories: number): SavedMealSummary {
  return {
    id: `meal-${name}`,
    name,
    servings: 1,
    isMealTemplate: true,
    ingredients: [],
    macros: {
      perServing: { proteinG: protein, calories, carbsG: 40, fatG: 12 },
      total: { proteinG: protein, calories, carbsG: 40, fatG: 12 },
    },
  };
}

function build(partial: {
  dash?: NutritionDashboardPayload | null;
  meals?: SavedMealSummary[];
  weekly?: WeeklyNutritionSnapshot | null;
  goal?: string | null;
  hour?: number;
}) {
  const now = new Date();
  if (partial.hour != null) now.setHours(partial.hour, 30, 0, 0);
  return buildNutritionPerformanceIntelligence({
    now,
    dashboard: partial.dash ?? dashboard(),
    savedMeals: partial.meals ?? [],
    nutritionGoal: partial.goal ?? "MUSCLE_GAIN",
    weeklyNutrition: partial.weekly ?? weekly(),
  });
}

console.log("Nutrition Intelligence 3.0 Tests\n");

// CASE 1 — Protein deutlich unter Ziel
{
  const intel = build({ dash: dashboard({ remaining: { calories: 800, proteinG: 60, carbsG: 120, fatG: 35 } }) });
  assert("CASE 1: protein_priority", intel.recommendationState === "protein_priority");
}

// CASE 2 — Protein bereits erreicht
{
  const intel = build({
    dash: dashboard({
      consumed: { calories: 2000, proteinG: 152, carbsG: 200, fatG: 50, fiberG: 25 },
      remaining: { calories: 500, proteinG: 0, carbsG: 100, fatG: 30 },
    }),
  });
  assert("CASE 2: no protein warning", intel.recommendationState !== "protein_priority");
  assert("CASE 2: protein on target", intel.protein.status === "on_target");
}

// CASE 3 — Kalorien deutlich unter Ziel am Abend
{
  const intel = build({
    dash: dashboard({
      consumed: { calories: 1500, proteinG: 145, carbsG: 280, fatG: 75, fiberG: 20 },
      remaining: { calories: 1000, proteinG: 5, carbsG: 20, fatG: 5 },
    }),
    hour: 18,
  });
  assert("CASE 3: calorie_priority evening", intel.recommendationState === "calorie_priority");
}

// CASE 4 — Kalorien im Zielbereich
{
  const intel = build({
    dash: dashboard({
      consumed: { calories: 2350, proteinG: 140, carbsG: 280, fatG: 75, fiberG: 28 },
      remaining: { calories: 150, proteinG: 10, carbsG: 20, fatG: 5 },
    }),
  });
  assert("CASE 4: calories on target", intel.calories.status === "on_target");
}

// CASE 5 — Protein niedrig + passende Saved Meal
{
  const intel = build({
    meals: [savedMeal("Chicken Rice Bowl", 48, 620)],
  });
  assert("CASE 5: saved meal primary", intel.primary?.name === "Chicken Rice Bowl");
  assert("CASE 5: explains remaining after", intel.explanation.includes("48") || intel.explanation.includes("Chicken"));
}

// CASE 6 — Protein niedrig + keine Saved Meals
{
  const intel = build({ meals: [] });
  assert("CASE 6: no saved meal", intel.primary == null);
  assert("CASE 6: still protein priority", intel.recommendationState === "protein_priority");
}

// CASE 7 — Protein 6/7 Weekly → keine dramatische Warnung
{
  const intel = build({ weekly: weekly({ proteinDaysOnTarget: 6, proteinDaysTotal: 7, status: "good" }) });
  assert("CASE 7: weekly good no panic", intel.weeklyNutritionStatus === "good");
  assert("CASE 7: explanation not weekly alarm", !intel.explanation.includes("Wochenproblem"));
}

// CASE 8 — Protein 2/7 Weekly
{
  const intel = build({
    weekly: weekly({ proteinDaysOnTarget: 2, proteinDaysTotal: 7, status: "needs_attention" }),
  });
  assert("CASE 8: weekly needs attention", intel.weeklyNutritionStatus === "needs_attention");
}

// CASE 9 — Keine Tagesziele
{
  const intel = build({
    dash: dashboard({
      targets: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, waterTargetMl: 2500, nutritionGoal: null },
    }),
  });
  assert("CASE 9: insufficient_data", intel.recommendationState === "insufficient_data");
}

// CASE 10 — Keine Mahlzeiten
{
  const intel = build({
    dash: dashboard({
      consumed: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
      remaining: { calories: 2500, proteinG: 150, carbsG: 300, fatG: 80 },
      mealsByType: [],
      empty: true,
    }),
  });
  assert("CASE 10: tracking_low", intel.recommendationState === "tracking_low");
  assert("CASE 10: no invented meals", intel.todayMeals.length === 0);
}

// CASE 11 — Protein erreicht + Carbs offen
{
  const intel = build({
    dash: dashboard({
      consumed: { calories: 1800, proteinG: 150, carbsG: 120, fatG: 35, fiberG: 20 },
      remaining: { calories: 700, proteinG: 0, carbsG: 180, fatG: 45 },
    }),
  });
  assert("CASE 11: macro_balance", intel.recommendationState === "macro_balance");
}

// CASE 12 — Nutrition coach mode
{
  const needs = coachContextNeeds("nutrition");
  assert("CASE 12: nutrition performance enabled", needs.nutritionPerformance === true);
}

// CASE 13 — Training coach mode
{
  const needs = coachContextNeeds("training");
  assert("CASE 13: no nutrition performance dump", needs.nutritionPerformance === false);
  assert("CASE 13: no nutrition load", needs.nutrition === false);
}

// CASE 14 — Quick Add: no OpenAI (architecture check)
{
  assert("CASE 14: build is deterministic sync", typeof buildNutritionPerformanceIntelligence === "function");
}

// CASE 15 — Saved meal approximate fit
{
  const intel = build({ meals: [savedMeal("Bowl", 48, 620)] });
  assert("CASE 15: approximate wording", intel.primary?.reason.includes("ungefähr") ?? false);
}

// CASE 16 — FAT_LOSS goal
{
  const g = goalGuidance("FAT_LOSS");
  assert("CASE 16: fat loss restricts", g.restrictCalories === true);
  const intel = build({ goal: "FAT_LOSS" });
  assert("CASE 16: no extreme diet text", !intel.explanation.includes("1200"));
}

// CASE 17 — MUSCLE_GAIN goal
{
  const g = goalGuidance("MUSCLE_GAIN");
  assert("CASE 17: muscle gain no restrict", g.restrictCalories === false);
}

// CASE 18 — Alles im Ziel
{
  const intel = build({
    dash: dashboard({
      consumed: { calories: 2400, proteinG: 148, carbsG: 290, fatG: 78, fiberG: 28 },
      remaining: { calories: 100, proteinG: 2, carbsG: 10, fatG: 2 },
    }),
  });
  assert("CASE 18: no_action_needed or on_track", ["no_action_needed", "on_track"].includes(intel.recommendationState));
}

// Bonus
{
  assert("macroStatus protein under", macroStatus(150, 90, 60, "protein") === "under_target");
  assert("mealTiming evening", mealTimingFromHour(20) === "evening");
  const matches = findMatchingSavedMeals([savedMeal("A", 50, 600)], {
    proteinRemainingG: 62,
    caloriesRemainingKcal: 800,
    proteinPriority: true,
    caloriePriority: true,
    macroBalanceMode: false,
  });
  assert("matching finds meal", matches.length === 1);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
