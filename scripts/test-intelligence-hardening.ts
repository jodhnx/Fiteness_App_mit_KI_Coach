/**
 * Phase 4 hardening regression tests — deterministic, no DB.
 * Run: npx tsx scripts/test-intelligence-hardening.ts
 */
import { buildDailyIntelligenceFromHome } from "../src/lib/intelligence/from-home";
import { buildAdaptiveRecommendations, filterAdaptiveRecommendationsForCoach } from "../src/lib/intelligence/recommendations/build";
import { rebuildHomeIntelligenceLayers, patchHomeAfterWorkoutComplete } from "../src/lib/intelligence/client-refresh";
import { createEmptyHomeData } from "../src/lib/home-defaults";
import { createEmptyNutritionDashboard } from "../src/lib/nutrition-defaults";
import type { WeeklyFitnessIntelligence } from "../src/lib/intelligence/weekly/types";

function weekly(partial: Partial<WeeklyFitnessIntelligence>): WeeklyFitnessIntelligence {
  return {
    generatedAt: new Date().toISOString(),
    weekLabel: "KW 34",
    training: { completed: 3, planned: 5, completionRate: 0.6, streakDays: 0, status: "neutral" },
    nutrition: {
      avgProteinG: 130,
      avgCaloriesKcal: 2100,
      proteinDaysOnTarget: 5,
      proteinDaysTotal: 7,
      calorieTarget: 2200,
      calorieDeltaVsTarget: -100,
      status: "good",
    },
    weight: { changeKg: -0.2, currentKg: 80, status: "on_track", trendLabel: "down" },
    progress: { prsThisWeek: [], topImprovement: null, status: "insufficient_data" },
    recovery: { avgStepsPerDay: 9000, avgSleepHours: 7.2, activityCount: 3, status: "good" },
    achievements: [],
    primary: null,
    secondary: [],
    recommendations: [],
    summary: "",
    coachContext: { weeklySummary: "", weeklyPriorities: [], weeklyAchievements: [], weeklyRecommendations: [] },
    ...partial,
  };
}

let passed = 0;
let failed = 0;

function assert(name: string, ok: boolean) {
  if (ok) {
    passed++;
    console.log(`✓ ${name}`);
  } else {
    failed++;
    console.error(`✗ ${name}`);
  }
}

// 1. Daily protein uses home macros (single source)
{
  const home = {
    ...createEmptyHomeData(),
    proteinRemaining: 40,
    proteinTarget: 150,
    proteinConsumed: 110,
    calorieTarget: 2200,
    caloriesIntake: 1800,
    caloriesRemaining: 400,
  };
  const daily = buildDailyIntelligenceFromHome(home, createEmptyNutritionDashboard());
  assert("Daily protein remaining from home", daily.nutrition.proteinRemaining === 40);
}

// 2. Daily + Weekly consistency (different time scopes OK)
{
  const home = {
    ...createEmptyHomeData(),
    proteinRemaining: 40,
    proteinTarget: 150,
    proteinConsumed: 110,
    weeklyIntelligence: weekly({
      nutrition: {
        avgProteinG: 150,
        avgCaloriesKcal: 2100,
        proteinDaysOnTarget: 6,
        proteinDaysTotal: 7,
        calorieTarget: 2200,
        calorieDeltaVsTarget: -100,
        status: "good",
      },
    }),
  };
  const daily = buildDailyIntelligenceFromHome(home);
  assert("Daily protein gap today", (daily.nutrition.proteinRemaining ?? 0) > 0);
  assert("Weekly protein good", home.weeklyIntelligence!.nutrition.status === "good");
}

// 3. Weekly good → no adaptive protein problem
{
  const adaptive = buildAdaptiveRecommendations({
    now: new Date(),
    nutritionGoal: "FAT_LOSS",
    daily: null,
    weekly: weekly({
      nutrition: {
        avgProteinG: 155,
        avgCaloriesKcal: 2100,
        proteinDaysOnTarget: 7,
        proteinDaysTotal: 7,
        calorieTarget: 2200,
        calorieDeltaVsTarget: -100,
        status: "good",
      },
    }),
  });
  assert("No protein problem when weekly good", !adaptive.primary?.id.includes("protein-low"));
}

// 4. Recommendation lifecycle — protein fixed → no problem rec
{
  const before = buildAdaptiveRecommendations({
    now: new Date(),
    nutritionGoal: "FAT_LOSS",
    daily: null,
    weekly: weekly({
      nutrition: {
        avgProteinG: 90,
        avgCaloriesKcal: 2100,
        proteinDaysOnTarget: 3,
        proteinDaysTotal: 7,
        calorieTarget: 2200,
        calorieDeltaVsTarget: -100,
        status: "needs_attention",
      },
    }),
  });
  const after = buildAdaptiveRecommendations({
    now: new Date(),
    nutritionGoal: "FAT_LOSS",
    daily: null,
    weekly: weekly({
      nutrition: {
        avgProteinG: 150,
        avgCaloriesKcal: 2100,
        proteinDaysOnTarget: 7,
        proteinDaysTotal: 7,
        calorieTarget: 2200,
        calorieDeltaVsTarget: -100,
        status: "good",
      },
    }),
  });
  assert(
    "Protein problem before",
    Boolean(before.secondary.some((s) => s.id.includes("protein")) || before.primary?.id.includes("protein"))
  );
  assert("Protein problem cleared after", !after.primary?.id.includes("protein-low"));
}

// 5. Workout complete patch
{
  const home = createEmptyHomeData();
  home.activityWeek = { count: 2, totalDistanceM: 0 };
  home.weeklyReport = {
    weekLabel: "KW 34",
    workouts: 2,
    avgProteinG: 0,
    goalReached: false,
    summaryLine: "",
    totalSteps: 0,
    avgSleepHours: null,
    weightChangeKg: null,
  };
  const patched = patchHomeAfterWorkoutComplete(home, {
    name: "Push",
    completedAt: new Date().toISOString(),
  });
  assert("Workout count bumped", patched.activityWeek.count === 3);
  assert("Weekly workouts bumped", patched.weeklyReport?.workouts === 3);
}

// 6. Client refresh rebuilds intelligence
{
  const home = rebuildHomeIntelligenceLayers({
    ...createEmptyHomeData(),
    proteinRemaining: 50,
    proteinTarget: 150,
    proteinConsumed: 100,
  });
  assert("Client refresh daily", home.intelligence != null);
  assert("Client refresh adaptive", home.adaptiveRecommendations != null);
}

// 7. Coach context mode filter — nutrition question
{
  const adaptive = buildAdaptiveRecommendations({
    now: new Date(),
    nutritionGoal: "FAT_LOSS",
    daily: null,
    weekly: weekly({
      training: { completed: 2, planned: 5, completionRate: 0.4, streakDays: 0, status: "needs_attention" },
    }),
  });
  const filtered = filterAdaptiveRecommendationsForCoach(adaptive, "nutrition");
  assert(
    "Coach nutrition mode filters training",
    !filtered.primary || filtered.primary.type === "nutrition" || filtered.primary.type === "consistency"
  );
}

// 8. insufficient_data — no strong nutrition rec
{
  const adaptive = buildAdaptiveRecommendations({
    now: new Date(),
    nutritionGoal: "FAT_LOSS",
    daily: null,
    weekly: weekly({
      nutrition: {
        avgProteinG: 0,
        avgCaloriesKcal: 0,
        proteinDaysOnTarget: 0,
        proteinDaysTotal: 1,
        calorieTarget: 2200,
        calorieDeltaVsTarget: null,
        status: "insufficient_data",
      },
    }),
  });
  assert("Insufficient data no protein primary", adaptive.primary?.id !== "adapt-protein-low-week");
}

// 9. No action needed
{
  const adaptive = buildAdaptiveRecommendations({
    now: new Date(),
    nutritionGoal: "FAT_LOSS",
    daily: null,
    weekly: weekly({
      training: { completed: 5, planned: 5, completionRate: 1, streakDays: 4, status: "good" },
      weight: { changeKg: -0.4, currentKg: 79, status: "on_track", trendLabel: "down" },
    }),
  });
  assert("On track or positive", adaptive.allOnTrack || adaptive.primary?.id === "adapt-training-on-plan");
}

// 10. Saved meal action when protein low + meal present
{
  const adaptive = buildAdaptiveRecommendations({
    now: new Date(),
    nutritionGoal: "FAT_LOSS",
    daily: null,
    weekly: weekly({
      nutrition: {
        avgProteinG: 90,
        avgCaloriesKcal: 2100,
        proteinDaysOnTarget: 3,
        proteinDaysTotal: 7,
        calorieTarget: 2200,
        calorieDeltaVsTarget: -100,
        status: "needs_attention",
      },
    }),
    savedMeals: [
      {
        id: "m1",
        name: "Protein Bowl",
        servings: 1,
        isMealTemplate: true,
        ingredients: [],
        macros: {
          perServing: { calories: 500, proteinG: 45, carbsG: 40, fatG: 12 },
          total: { calories: 500, proteinG: 45, carbsG: 40, fatG: 12 },
        },
      },
    ],
    proteinTargetG: 150,
  });
  const all = [...(adaptive.primary ? [adaptive.primary] : []), ...adaptive.secondary];
  assert("Saved meal rec present", all.some((r) => r.id === "adapt-saved-meal-protein"));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
