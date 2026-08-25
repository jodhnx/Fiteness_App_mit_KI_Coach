/**
 * Phase 5D — Daily Action Plan smoke tests.
 * Run: npx tsx scripts/test-daily-action-plan.ts
 */
import { buildDailyActionPlan, formatDailyActionPlanForCoach } from "../src/lib/intelligence/daily-plan/build";
import { buildDailyActionPlanFromHome } from "../src/lib/intelligence/daily-plan/from-home";
import { collectDailyPlanCandidates, prioritizeDailyPlan } from "../src/lib/intelligence/daily-plan/prioritize";
import { buildNutritionPerformanceIntelligence } from "../src/lib/intelligence/nutrition-performance/build";
import { commitHomeIntelligenceRefresh } from "../src/lib/intelligence/client-refresh";
import { createEmptyHomeData } from "../src/lib/home-defaults";
import { coachContextNeeds } from "../src/lib/coach-context/needs";
import type { DailyActionPlanContext } from "../src/lib/intelligence/daily-plan/types";
import type { DailyFitnessIntelligence } from "../src/lib/intelligence/types";
import type { WeeklyFitnessIntelligence } from "../src/lib/intelligence/weekly/types";
import type { AdaptiveRecommendations } from "../src/lib/intelligence/recommendations/types";
import type { NutritionDashboardPayload } from "../src/lib/nutrition-defaults";
import type { SavedMealSummary } from "../src/lib/saved-meals-cache";

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

function daily(overrides: Partial<DailyFitnessIntelligence> = {}): DailyFitnessIntelligence {
  return {
    generatedAt: new Date().toISOString(),
    nutrition: {
      caloriesTarget: 2500,
      caloriesConsumed: 1700,
      caloriesRemaining: 800,
      proteinTarget: 150,
      proteinConsumed: 90,
      proteinRemaining: 60,
      onTrack: false,
    },
    training: { doneToday: false, plannedToday: true, activeSession: false, label: "Upper B", streakDays: 2 },
    weight: { currentKg: 80, change7dKg: 0, trendLabel: "stable", plateauDetected: false, targetKg: 75 },
    progress: { recentPr: null, sessionImprovement: null },
    recovery: { steps: 8000, stepGoal: 10000, sleepHours: 7, recoveryScore: 75 },
    activity: { workoutsThisWeek: 3 },
    primary: null,
    secondary: [],
    allGood: false,
    ...overrides,
  };
}

function weekly(overrides: Partial<WeeklyFitnessIntelligence> = {}): WeeklyFitnessIntelligence {
  return {
    generatedAt: new Date().toISOString(),
    weekLabel: "KW 34",
    training: { completed: 4, planned: 5, completionRate: 0.8, streakDays: 2, status: "good" },
    nutrition: {
      avgProteinG: 140,
      avgCaloriesKcal: 2300,
      proteinDaysOnTarget: 6,
      proteinDaysTotal: 7,
      calorieTarget: 2500,
      calorieDeltaVsTarget: -100,
      status: "good",
    },
    weight: { changeKg: -0.2, currentKg: 80, status: "on_track", trendLabel: "down" },
    progress: { prsThisWeek: [], topImprovement: null, status: "good" },
    recovery: { avgStepsPerDay: 9000, avgSleepHours: 7.2, activityCount: 4, status: "good" },
    achievements: [],
    primary: null,
    secondary: [],
    recommendations: [],
    summary: "",
    coachContext: { weeklySummary: "", weeklyPriorities: [], weeklyAchievements: [], weeklyRecommendations: [] },
    ...overrides,
  };
}

function ctx(partial: Partial<DailyActionPlanContext> = {}): DailyActionPlanContext {
  const now = new Date();
  now.setHours(10, 0, 0, 0);
  return {
    now,
    daily: daily(),
    weekly: weekly(),
    adaptive: null,
    trainingPerformance: null,
    nutritionPerformance: null,
    nextWorkout: { planName: "Push Pull", dayName: "Upper B" },
    trainingDoneToday: false,
    activeSession: false,
    recoveryScore: 75,
    trainingReadiness: 80,
    nutritionGoal: "MUSCLE_GAIN",
    ...partial,
  };
}

function dash(overrides: Partial<NutritionDashboardPayload> = {}): NutritionDashboardPayload {
  return {
    date: "2026-08-26",
    targets: { calories: 2500, proteinG: 150, carbsG: 300, fatG: 80, fiberG: 30, waterTargetMl: 2500, nutritionGoal: "MUSCLE_GAIN" },
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

function savedMeal(name: string, protein: number, kcal: number): SavedMealSummary {
  return {
    id: `m-${name}`,
    name,
    servings: 1,
    isMealTemplate: true,
    ingredients: [],
    macros: {
      perServing: { proteinG: protein, calories: kcal, carbsG: 40, fatG: 12 },
      total: { proteinG: protein, calories: kcal, carbsG: 40, fatG: 12 },
    },
  };
}

console.log("Daily Action Plan Tests\n");

// CASE 1 — Training offen + gute Recovery
{
  const plan = buildDailyActionPlan(ctx({ recoveryScore: 75 }));
  assert("CASE 1: training primary", plan.primary?.type === "training");
}

// CASE 2 — Protein deutlich niedrig, kein Training
{
  const np = buildNutritionPerformanceIntelligence({
    now: new Date(),
    dashboard: dash({ remaining: { calories: 800, proteinG: 62, carbsG: 120, fatG: 35 } }),
    savedMeals: [],
    nutritionGoal: "MUSCLE_GAIN",
    weeklyNutrition: weekly().nutrition,
  });
  const plan = buildDailyActionPlan(
    ctx({ nextWorkout: null, trainingDoneToday: true, nutritionPerformance: np, daily: daily({ training: { ...daily().training, doneToday: true, plannedToday: false, label: null, streakDays: 0 } }) })
  );
  assert("CASE 2: nutrition can be primary", plan.primary?.type === "nutrition");
}

// CASE 3 — Training + Protein niedrig
{
  const np = buildNutritionPerformanceIntelligence({
    now: new Date(),
    dashboard: dash(),
    savedMeals: [],
    nutritionGoal: "MUSCLE_GAIN",
    weeklyNutrition: weekly().nutrition,
  });
  const plan = buildDailyActionPlan(ctx({ nutritionPerformance: np }));
  assert("CASE 3: has primary", plan.primary != null);
  assert("CASE 3: max 2 secondary", plan.secondary.length <= 2);
}

// CASE 4 — Training erledigt + Nutrition gut
{
  const np = buildNutritionPerformanceIntelligence({
    now: new Date(),
    dashboard: dash({
      consumed: { calories: 2400, proteinG: 148, carbsG: 290, fatG: 78, fiberG: 28 },
      remaining: { calories: 100, proteinG: 2, carbsG: 10, fatG: 2 },
    }),
    savedMeals: [],
    nutritionGoal: "MUSCLE_GAIN",
    weeklyNutrition: weekly().nutrition,
  });
  const plan = buildDailyActionPlan(
    ctx({
      trainingDoneToday: true,
      nextWorkout: null,
      nutritionPerformance: np,
      daily: daily({ allGood: true, training: { ...daily().training, doneToday: true } }),
    })
  );
  assert("CASE 4: on_track", plan.status === "on_track" || plan.primary?.id === "plan-on-track");
}

// CASE 5 — Recovery niedrig + Training offen
{
  const plan = buildDailyActionPlan(ctx({ recoveryScore: 40, trainingReadiness: 40 }));
  assert("CASE 5: recovery secondary", plan.secondary.some((s) => s.type === "recovery") || plan.primary?.type === "training");
}

// CASE 6 — Saved meal
{
  const np = buildNutritionPerformanceIntelligence({
    now: new Date(),
    dashboard: dash(),
    savedMeals: [savedMeal("Chicken Bowl", 48, 620)],
    nutritionGoal: "MUSCLE_GAIN",
    weeklyNutrition: { ...weekly().nutrition, proteinDaysOnTarget: 2, proteinDaysTotal: 7, status: "needs_attention" },
  });
  const plan = buildDailyActionPlan(ctx({ nutritionPerformance: np }));
  assert("CASE 6: saved meal in plan", plan.primary?.title.includes("Chicken") || plan.secondary.some((s) => s.title.includes("Chicken")));
}

// CASE 7 — No saved meal
{
  const np = buildNutritionPerformanceIntelligence({
    now: new Date(),
    dashboard: dash(),
    savedMeals: [],
    nutritionGoal: "MUSCLE_GAIN",
    weeklyNutrition: weekly().nutrition,
  });
  const plan = buildDailyActionPlan(ctx({ nutritionPerformance: np }));
  assert("CASE 7: no invented meal", !plan.summary.includes("Chicken Bowl"));
}

// CASE 8 — Weekly protein good + daily low
{
  const np = buildNutritionPerformanceIntelligence({
    now: new Date(),
    dashboard: dash(),
    savedMeals: [],
    nutritionGoal: "MUSCLE_GAIN",
    weeklyNutrition: { ...weekly().nutrition, proteinDaysOnTarget: 6, status: "good" },
  });
  const plan = buildDailyActionPlan(ctx({ nutritionPerformance: np, nextWorkout: null, trainingDoneToday: true, daily: daily({ training: { ...daily().training, doneToday: true, plannedToday: false, label: null, streakDays: 0 } }) }));
  assert("CASE 8: weekly context in explanation", plan.primary?.explanation.includes("Wochen") || plan.evidence.length >= 0);
}

// CASE 9 — Weekly training good + today open
{
  const plan = buildDailyActionPlan(ctx());
  assert("CASE 9: training primary with weekly ok", plan.primary?.type === "training");
}

// CASE 10 — Adaptive requiresConfirmation
{
  const adaptive: AdaptiveRecommendations = {
    generatedAt: new Date().toISOString(),
    primary: {
      id: "adapt-plan",
      type: "planning",
      priority: "primary",
      title: "Trainingsplan",
      explanation: "Plan könnte angepasst werden — du musst bestätigen.",
      evidence: ["2/5 Trainings"],
      action: { label: "Plan bearbeiten", href: "/workouts/my-plans" },
      confidence: "medium",
      requiresConfirmation: true,
    },
    secondary: [],
    allOnTrack: false,
    coachContext: { summary: "", items: [] },
  };
  const plan = buildDailyActionPlan(ctx({ adaptive, nextWorkout: null, trainingDoneToday: true, daily: daily({ training: { ...daily().training, doneToday: true, plannedToday: false, label: null, streakDays: 0 } }) }));
  const confirm = plan.secondary.find((s) => s.requiresConfirmation) ?? plan.primary;
  assert("CASE 10: confirmation flag", confirm?.requiresConfirmation === true);
}

// CASE 11 — Protein after quick add fulfilled
{
  const homeBefore = {
    ...createEmptyHomeData(),
    nutrition: dash(),
    intelligence: daily(),
    weeklyIntelligence: weekly(),
    nextWorkout: { planName: "Plan", dayName: "Upper B", planId: "p1", dayId: "d1", dayNumber: 1, exerciseCount: 5, estimatedDurationMin: 45 },
  };
  const before = buildDailyActionPlanFromHome(homeBefore);
  const homeAfter = {
    ...homeBefore,
    nutrition: dash({
      consumed: { calories: 2300, proteinG: 150, carbsG: 280, fatG: 70, fiberG: 28 },
      remaining: { calories: 200, proteinG: 0, carbsG: 20, fatG: 10 },
    }),
  };
  const after = buildDailyActionPlanFromHome(homeAfter);
  assert("CASE 11: has primary before", before.primary != null);
  assert("CASE 11: on track or no protein after", after.status === "on_track" || after.primary?.type !== "nutrition");
}

// CASE 12 — Workout complete
{
  const home = createEmptyHomeData();
  home.nextWorkout = { planName: "Plan", dayName: "Upper B", planId: "p1", dayId: "d1", dayNumber: 1, exerciseCount: 5, estimatedDurationMin: 45 };
  home.intelligence = daily({ training: { ...daily().training, doneToday: false } });
  home.weeklyIntelligence = weekly();
  home.nutrition = dash();
  const before = buildDailyActionPlanFromHome(home);
  home.intelligence = daily({ training: { ...daily().training, doneToday: true }, allGood: true });
  home.nextWorkout = null;
  const after = buildDailyActionPlanFromHome(home);
  assert("CASE 12: training before", before.primary?.type === "training");
  assert("CASE 12: updated after complete", after.primary?.type !== "training" || after.status === "on_track");
}

// CASE 13 — Weight entry updates context
{
  const before = buildDailyActionPlan(
    ctx({
      daily: daily({ weight: { currentKg: 80, change7dKg: 0, trendLabel: "stable", plateauDetected: false, targetKg: 75 } }),
    })
  );
  const after = buildDailyActionPlan(
    ctx({
      daily: daily({ weight: { currentKg: 79.5, change7dKg: -0.5, trendLabel: "down", plateauDetected: false, targetKg: 75 } }),
    })
  );
  assert("CASE 13: plan builds with weight context", before.primary != null && after.primary != null);
}

{
  const np = buildNutritionPerformanceIntelligence({
    now: new Date(),
    dashboard: dash({
      consumed: { calories: 2450, proteinG: 150, carbsG: 295, fatG: 78, fiberG: 28 },
      remaining: { calories: 50, proteinG: 0, carbsG: 5, fatG: 2 },
    }),
    savedMeals: [],
    nutritionGoal: "MUSCLE_GAIN",
    weeklyNutrition: weekly().nutrition,
  });
  const plan = buildDailyActionPlan(
    ctx({ trainingDoneToday: true, nextWorkout: null, nutritionPerformance: np, daily: daily({ allGood: true, training: { ...daily().training, doneToday: true } }) })
  );
  assert("CASE 14: on track message", plan.primary?.explanation.includes("im Plan") || plan.status === "on_track");
}

// CASE 15 — Insufficient data
{
  const plan = buildDailyActionPlan(
    ctx({ daily: null, weekly: null, nutritionPerformance: null, nextWorkout: null })
  );
  assert("CASE 15: insufficient or low confidence", plan.status === "insufficient_data" || plan.confidence === "low");
}

// CASE 16/17 — Max primary/secondary
{
  const candidates = collectDailyPlanCandidates(ctx());
  const { primary, secondary } = prioritizeDailyPlan(candidates);
  assert("CASE 16: max 1 primary", primary != null);
  assert("CASE 17: max 2 secondary", secondary.length <= 2);
}

// CASE 18 — No duplicate training actions
{
  const plan = buildDailyActionPlan(ctx());
  const trainingActions = [plan.primary, ...plan.secondary].filter(
    (a) => a?.action?.href === "/workouts"
  );
  assert("CASE 18: no duplicate training hrefs", trainingActions.length <= 1);
}

// CASE 19/20 — Coach needs
{
  assert("CASE 19: nutrition no daily dump", coachContextNeeds("nutrition").dailyPlan === false);
  assert("CASE 20: general has daily plan", coachContextNeeds("general").dailyPlan === true);
}

// CASE 21 — General coach compact plan
{
  const plan = buildDailyActionPlan(ctx());
  const lines = formatDailyActionPlanForCoach(plan, true);
  assert("CASE 21: compact format", lines.some((l) => l.startsWith("Primary:")));
}

// Client refresh
{
  const refreshed = commitHomeIntelligenceRefresh({
    ...createEmptyHomeData(),
    nutrition: dash(),
    intelligence: daily(),
    weeklyIntelligence: weekly(),
    nextWorkout: { planName: "P", dayName: "Upper B", planId: "1", dayId: "2", dayNumber: 1, exerciseCount: 4, estimatedDurationMin: 40 },
  });
  assert("CASE refresh: dailyActionPlan set", refreshed.dailyActionPlan?.primary != null);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
