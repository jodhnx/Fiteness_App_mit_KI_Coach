/**
 * Deterministic smoke tests for Adaptive Recommendations.
 * Run: npx tsx scripts/test-adaptive-recommendations.ts
 */
import { buildAdaptiveRecommendations } from "../src/lib/intelligence/recommendations/build";
import type { AdaptiveRecommendationContext } from "../src/lib/intelligence/recommendations/context";
import type { DailyFitnessIntelligence } from "../src/lib/intelligence/types";
import type { WeeklyFitnessIntelligence } from "../src/lib/intelligence/weekly/types";
import type { SavedMealSummary } from "../src/lib/saved-meals-cache";

function emptyDaily(overrides: Partial<DailyFitnessIntelligence> = {}): DailyFitnessIntelligence {
  return {
    generatedAt: new Date().toISOString(),
    nutrition: {
      caloriesTarget: 2200,
      caloriesConsumed: 2000,
      caloriesRemaining: 200,
      proteinTarget: 150,
      proteinConsumed: 120,
      proteinRemaining: 30,
      onTrack: false,
    },
    training: { doneToday: false, plannedToday: true, activeSession: false, label: null, streakDays: 0 },
    weight: {
      currentKg: 80,
      change7dKg: 0,
      trendLabel: "stable",
      plateauDetected: false,
      targetKg: 75,
    },
    progress: { recentPr: null, sessionImprovement: null },
    recovery: { steps: 8000, stepGoal: 10000, sleepHours: 7, recoveryScore: 70 },
    activity: { workoutsThisWeek: 3 },
    primary: null,
    secondary: [],
    allGood: false,
    ...overrides,
  };
}

function emptyWeekly(overrides: Partial<WeeklyFitnessIntelligence> = {}): WeeklyFitnessIntelligence {
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
    ...overrides,
  };
}

function ctx(partial: {
  daily?: Partial<DailyFitnessIntelligence> | null;
  weekly?: Partial<WeeklyFitnessIntelligence> | null;
  savedMeals?: SavedMealSummary[];
  nutritionGoal?: string | null;
}): AdaptiveRecommendationContext {
  return {
    now: new Date(),
    nutritionGoal: partial.nutritionGoal ?? "FAT_LOSS",
    daily:
      partial.daily === null
        ? null
        : partial.daily
          ? emptyDaily(partial.daily)
          : emptyDaily(),
    weekly:
      partial.weekly === null
        ? null
        : partial.weekly
          ? emptyWeekly(partial.weekly)
          : emptyWeekly(),
    proteinTargetG: 150,
    workoutDaysPerWeek: 5,
    savedMeals: partial.savedMeals,
  };
}

let passed = 0;
let failed = 0;

function assert(name: string, ok: boolean, detail?: string) {
  if (ok) {
    passed++;
    console.log(`✓ ${name}`);
  } else {
    failed++;
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// CASE 1: Protein 3/7 zu niedrig
{
  const r = buildAdaptiveRecommendations(
    ctx({
      weekly: {
        nutrition: {
          avgProteinG: 100,
          avgCaloriesKcal: 2100,
          proteinDaysOnTarget: 3,
          proteinDaysTotal: 7,
          calorieTarget: 2200,
          calorieDeltaVsTarget: -100,
          status: "needs_attention",
        },
      },
    })
  );
  assert("CASE 1: nutrition rec", r.primary?.type === "nutrition" || r.secondary.some((s) => s.type === "nutrition"));
}

// CASE 2: Protein 7/7
{
  const r = buildAdaptiveRecommendations(
    ctx({
      weekly: {
        nutrition: {
          avgProteinG: 155,
          avgCaloriesKcal: 2100,
          proteinDaysOnTarget: 7,
          proteinDaysTotal: 7,
          calorieTarget: 2200,
          calorieDeltaVsTarget: -100,
          status: "good",
        },
        weight: { changeKg: -0.3, currentKg: 80, status: "on_track", trendLabel: "down" },
        training: { completed: 4, planned: 5, completionRate: 0.8, streakDays: 2, status: "good" },
      },
    })
  );
  assert("CASE 2: no protein problem", !r.primary?.id.includes("protein-low"));
}

// CASE 3: Training 5/5
{
  const r = buildAdaptiveRecommendations(
    ctx({
      weekly: {
        training: { completed: 5, planned: 5, completionRate: 1, streakDays: 3, status: "good" },
      },
    })
  );
  assert(
    "CASE 3: positive or on-track",
    r.primary?.id === "adapt-training-on-plan" ||
      r.primary?.id === "adapt-all-on-track" ||
      r.secondary.some((s) => s.id === "adapt-training-on-plan")
  );
}

// CASE 4: Training 2/5
{
  const r = buildAdaptiveRecommendations(
    ctx({
      weekly: {
        training: { completed: 2, planned: 5, completionRate: 0.4, streakDays: 0, status: "needs_attention" },
      },
    })
  );
  assert(
    "CASE 4: planning rec",
    r.primary?.type === "planning" || r.primary?.type === "training"
  );
}

// CASE 5: Gewicht sinkt passend
{
  const r = buildAdaptiveRecommendations(
    ctx({
      weekly: {
        weight: { changeKg: -0.4, currentKg: 79, status: "on_track", trendLabel: "down" },
        nutrition: {
          avgProteinG: 150,
          avgCaloriesKcal: 2100,
          proteinDaysOnTarget: 6,
          proteinDaysTotal: 7,
          calorieTarget: 2200,
          calorieDeltaVsTarget: -100,
          status: "good",
        },
      },
      daily: { weight: { currentKg: 79, change7dKg: -0.4, trendLabel: "down", plateauDetected: false, targetKg: 75 } },
    })
  );
  assert(
    "CASE 5: no unnecessary intervention",
    r.allOnTrack || r.primary?.id === "adapt-weight-on-track" || r.primary?.id === "adapt-all-on-track"
  );
}

// CASE 6: Plateau + nutrition pattern
{
  const r = buildAdaptiveRecommendations(
    ctx({
      daily: {
        weight: { currentKg: 80, change7dKg: 0, trendLabel: "stable", plateauDetected: true, targetKg: 75 },
      },
      weekly: {
        weight: { changeKg: 0, currentKg: 80, status: "neutral", trendLabel: "stable" },
        nutrition: {
          avgProteinG: 120,
          avgCaloriesKcal: 2450,
          proteinDaysOnTarget: 4,
          proteinDaysTotal: 7,
          calorieTarget: 2200,
          calorieDeltaVsTarget: 250,
          status: "needs_attention",
        },
        training: { completed: 4, planned: 5, completionRate: 0.8, streakDays: 2, status: "good" },
      },
    })
  );
  assert(
    "CASE 6: plateau nutrition rec",
    r.primary?.id === "adapt-weight-plateau-nutrition" ||
      r.secondary.some((s) => s.id === "adapt-weight-plateau-nutrition")
  );
}

// CASE 7: Plateau + insufficient data
{
  const r = buildAdaptiveRecommendations(
    ctx({
      daily: {
        weight: { currentKg: 80, change7dKg: null, trendLabel: "insufficient_data", plateauDetected: true, targetKg: 75 },
      },
    })
  );
  const strong = r.primary?.confidence === "high" && r.primary?.id.includes("plateau-nutrition");
  assert("CASE 7: no strong rec", !strong);
}

// CASE 8: Recovery low
{
  const r = buildAdaptiveRecommendations(
    ctx({
      weekly: {
        recovery: { avgStepsPerDay: 5000, avgSleepHours: 6.1, activityCount: 2, status: "needs_attention" },
      },
    })
  );
  assert("CASE 8: recovery rec", r.secondary.some((s) => s.type === "recovery") || r.primary?.type === "recovery");
}

// CASE 9: New PRs
{
  const r = buildAdaptiveRecommendations(
    ctx({
      weekly: {
        progress: {
          prsThisWeek: [{ exerciseName: "Bench Press", valueKg: 100, achievedAt: new Date().toISOString() }],
          topImprovement: null,
          status: "positive",
        },
      },
    })
  );
  assert("CASE 9: progress rec", r.secondary.some((s) => s.id === "adapt-progress-pr") || r.primary?.id === "adapt-progress-pr");
}

// CASE 10: Multiple problems → max 1+2
{
  const r = buildAdaptiveRecommendations(
    ctx({
      weekly: {
        training: { completed: 1, planned: 5, completionRate: 0.2, streakDays: 0, status: "needs_attention" },
        nutrition: {
          avgProteinG: 90,
          avgCaloriesKcal: 2600,
          proteinDaysOnTarget: 2,
          proteinDaysTotal: 7,
          calorieTarget: 2200,
          calorieDeltaVsTarget: 400,
          status: "needs_attention",
        },
      },
    })
  );
  assert("CASE 10: max primary", r.primary != null);
  assert("CASE 10: max 2 secondary", r.secondary.length <= 2);
}

// CASE 11: Saved meal
{
  const meals: SavedMealSummary[] = [
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
  ];
  const r = buildAdaptiveRecommendations(
    ctx({
      savedMeals: meals,
      weekly: {
        nutrition: {
          avgProteinG: 100,
          avgCaloriesKcal: 2100,
          proteinDaysOnTarget: 3,
          proteinDaysTotal: 7,
          calorieTarget: 2200,
          calorieDeltaVsTarget: -100,
          status: "needs_attention",
        },
      },
    })
  );
  assert(
    "CASE 11: saved meal action",
    [...(r.primary ? [r.primary] : []), ...r.secondary].some((x) => x.id === "adapt-saved-meal-protein")
  );
}

// CASE 12: Calorie target change → requiresConfirmation
{
  const r = buildAdaptiveRecommendations(
    ctx({
      daily: {
        weight: { currentKg: 80, change7dKg: 0, trendLabel: "stable", plateauDetected: true, targetKg: 75 },
      },
      weekly: {
        nutrition: {
          avgProteinG: 130,
          avgCaloriesKcal: 2500,
          proteinDaysOnTarget: 5,
          proteinDaysTotal: 7,
          calorieTarget: 2200,
          calorieDeltaVsTarget: 300,
          status: "needs_attention",
        },
        training: { completed: 4, planned: 5, completionRate: 0.8, streakDays: 2, status: "good" },
      },
    })
  );
  const all = [...(r.primary ? [r.primary] : []), ...r.secondary];
  assert(
    "CASE 12: requiresConfirmation",
    all.some((x) => x.requiresConfirmation === true)
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
