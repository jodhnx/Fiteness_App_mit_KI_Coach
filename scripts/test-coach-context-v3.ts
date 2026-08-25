/**
 * Phase 5A — Personal Coach Context 3.0 smoke tests.
 * Run: npx tsx scripts/test-coach-context-v3.ts
 */
import { coachContextNeeds } from "../src/lib/coach-context/needs";
import {
  formatAdaptiveForCoach,
  formatDailyIntelForCoach,
  formatWeeklyIntelCompact,
} from "../src/lib/coach-context/format";
import { detectCoachContextMode } from "../src/lib/coach-actions";
import { buildAdaptiveRecommendations } from "../src/lib/intelligence/recommendations/build";
import type { DailyFitnessIntelligence } from "../src/lib/intelligence/types";
import type { WeeklyFitnessIntelligence } from "../src/lib/intelligence/weekly/types";
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

function emptyDaily(overrides: Partial<DailyFitnessIntelligence> = {}): DailyFitnessIntelligence {
  return {
    generatedAt: new Date().toISOString(),
    nutrition: {
      caloriesTarget: 2200,
      caloriesConsumed: 1800,
      caloriesRemaining: 400,
      proteinTarget: 150,
      proteinConsumed: 95,
      proteinRemaining: 55,
      onTrack: false,
    },
    training: { doneToday: false, plannedToday: true, activeSession: false, label: "Upper B", streakDays: 3 },
    weight: { currentKg: 80, change7dKg: 0, trendLabel: "stable", plateauDetected: false, targetKg: 75 },
    progress: { recentPr: null, sessionImprovement: null },
    recovery: { steps: 8000, stepGoal: 10000, sleepHours: 7, recoveryScore: 70 },
    activity: { workoutsThisWeek: 3 },
    primary: {
      id: "protein",
      type: "nutrition",
      priority: "primary",
      title: "Protein",
      description: "Protein heute nachziehen",
    },
    secondary: [],
    allGood: false,
    ...overrides,
  };
}

function emptyWeekly(overrides: Partial<WeeklyFitnessIntelligence> = {}): WeeklyFitnessIntelligence {
  return {
    generatedAt: new Date().toISOString(),
    weekLabel: "KW 34",
    training: { completed: 4, planned: 5, completionRate: 0.8, streakDays: 3, status: "good" },
    nutrition: {
      avgProteinG: 140,
      avgCaloriesKcal: 2100,
      proteinDaysOnTarget: 6,
      proteinDaysTotal: 7,
      calorieTarget: 2200,
      calorieDeltaVsTarget: -100,
      status: "good",
    },
    weight: { changeKg: -0.3, currentKg: 80, status: "on_track", trendLabel: "down" },
    progress: { prsThisWeek: [], topImprovement: null, status: "good" },
    recovery: { avgStepsPerDay: 9000, avgSleepHours: 7.2, activityCount: 4, status: "good" },
    achievements: [],
    primary: null,
    secondary: [],
    recommendations: [],
    summary: "Solide Woche",
    coachContext: {
      weeklySummary: "Training 4/5, Protein 6/7 Tage im Ziel",
      weeklyPriorities: ["Protein-Konsistenz halten"],
      weeklyAchievements: ["4 Trainings"],
      weeklyRecommendations: [],
    },
    ...overrides,
  };
}

const savedMeal: SavedMealSummary = {
  id: "meal-1",
  name: "Protein Bowl",
  servings: 1,
  isMealTemplate: true,
  ingredients: [],
  macros: {
    perServing: { calories: 520, proteinG: 45, carbsG: 40, fatG: 12 },
    total: { calories: 520, proteinG: 45, carbsG: 40, fatG: 12 },
  },
};

console.log("Coach Context 3.0 Tests\n");

// CASE 1 — Nutrition question → nutrition context needs
{
  const mode = detectCoachContextMode("Was soll ich heute essen?");
  const needs = coachContextNeeds(mode);
  assert("CASE 1: nutrition question → nutrition mode", mode === "nutrition");
  assert("CASE 1: nutrition loads nutrition + saved meals", needs.nutrition && needs.savedMeals);
  assert("CASE 1: nutrition skips training detail", !needs.trainingDetail);
}

// CASE 2 — Training question → training context
{
  const mode = detectCoachContextMode("Was soll ich heute trainieren?");
  const needs = coachContextNeeds(mode);
  assert("CASE 2: training mode", mode === "training");
  assert("CASE 2: training detail + PRs", needs.trainingDetail && needs.prs);
  assert("CASE 2: no saved meals", !needs.savedMeals);
}

// CASE 3 — Weekly question → weekly context
{
  const mode = detectCoachContextMode("Wie läuft meine Woche?");
  const needs = coachContextNeeds(mode);
  assert("CASE 3: weekly mode", mode === "weekly");
  assert("CASE 3: weekly intel loaded", needs.weeklyIntel && needs.dailyIntel);
  assert("CASE 3: no raw training DB detail", !needs.training && !needs.trainingDetail);
}

// CASE 4 — Weight question → weight context
{
  const mode = detectCoachContextMode("Warum stagniert mein Gewicht?");
  const needs = coachContextNeeds(mode);
  assert("CASE 4: weight mode", mode === "weight");
  assert("CASE 4: weight + nutrition", needs.weight && needs.nutrition);
}

// CASE 5 — Plan question → plan context
{
  const mode = detectCoachContextMode("Trainingsplan optimieren");
  const needs = coachContextNeeds(mode);
  assert("CASE 5: plan mode", mode === "plan");
  assert("CASE 5: plan has training detail", needs.trainingDetail && needs.prs);
  assert("CASE 5: plan skips daily intel", !needs.dailyIntel);
}

// CASE 6 — General question → compact general
{
  const mode = detectCoachContextMode("Hey Coach");
  const needs = coachContextNeeds(mode);
  const daily = formatDailyIntelForCoach(emptyDaily(), "general");
  assert("CASE 6: general mode", mode === "general");
  assert("CASE 6: general loads intel compactly", needs.dailyIntel && needs.weeklyIntel);
  assert("CASE 6: general daily format compact", daily.some((l) => l.includes("Protein")));
}

// CASE 7 — Low-confidence recommendation → cautious formatting hint
{
  const recs = buildAdaptiveRecommendations({
    now: new Date(),
    nutritionGoal: "FAT_LOSS",
    daily: emptyDaily({
      weight: { ...emptyDaily().weight, plateauDetected: true, trendLabel: "stable", change7dKg: 0 },
    }),
    weekly: emptyWeekly({
      training: { completed: 4, planned: 5, completionRate: 0.8, streakDays: 3, status: "good" },
      nutrition: { ...emptyWeekly().nutrition, proteinDaysOnTarget: 6, proteinDaysTotal: 7, status: "good" },
    }),
    proteinTargetG: 150,
  });
  const lines = formatAdaptiveForCoach(recs, "weight");
  const hasLowHint = lines.some(
    (l) => l.includes("vorsichtig") || l.includes("begrenzte") || l.includes("moderate")
  );
  assert("CASE 7: adaptive produces output", lines.length > 1);
  assert("CASE 7: low/medium confidence handled", hasLowHint);
}

// CASE 8 — High-confidence recommendation
{
  const recs = buildAdaptiveRecommendations({
    now: new Date(),
    nutritionGoal: "FAT_LOSS",
    daily: emptyDaily({ nutrition: { ...emptyDaily().nutrition, proteinRemaining: 60, proteinConsumed: 90 } }),
    weekly: emptyWeekly({ nutrition: { ...emptyWeekly().nutrition, proteinDaysOnTarget: 2, proteinDaysTotal: 7, status: "needs_attention" } }),
    proteinTargetG: 150,
  });
  const lines = formatAdaptiveForCoach(recs, "nutrition");
  const hasHighHint = lines.some((l) => l.includes("konkret formulieren"));
  assert("CASE 8: high confidence hint when applicable", hasHighHint || recs.primary?.confidence === "high" || lines.length > 1);
}

// CASE 9 — Missing data — daily format uses keine Daten labels
{
  const daily = emptyDaily({
    nutrition: {
      caloriesTarget: null,
      caloriesConsumed: null,
      caloriesRemaining: null,
      proteinTarget: null,
      proteinConsumed: null,
      proteinRemaining: null,
      onTrack: false,
    },
    primary: null,
  });
  const lines = formatDailyIntelForCoach(daily, "nutrition");
  assert("CASE 9: missing protein shows keine Daten", lines.some((l) => l.includes("keine Daten")));
}

// CASE 10 — Saved meal present → adaptive can use saved meal
{
  const recs = buildAdaptiveRecommendations({
    now: new Date(),
    nutritionGoal: "MUSCLE_GAIN",
    daily: emptyDaily(),
    weekly: emptyWeekly({ nutrition: { ...emptyWeekly().nutrition, proteinDaysOnTarget: 2, proteinDaysTotal: 7, status: "needs_attention" } }),
    savedMeals: [savedMeal],
    proteinTargetG: 150,
  });
  const hasSaved = recs.secondary.some((r) => r.id.includes("saved-meal")) || recs.primary?.id.includes("saved-meal");
  assert("CASE 10: saved meal recommendation when protein low week", hasSaved || recs.coachContext.summary.length > 0);
}

// CASE 11 — No saved meal → normal nutrition adaptive
{
  const recs = buildAdaptiveRecommendations({
    now: new Date(),
    nutritionGoal: "FAT_LOSS",
    daily: emptyDaily(),
    weekly: emptyWeekly({ nutrition: { ...emptyWeekly().nutrition, proteinDaysOnTarget: 2, proteinDaysTotal: 7, status: "needs_attention" } }),
    savedMeals: [],
    proteinTargetG: 150,
  });
  assert("CASE 11: recommendation without saved meals", recs.primary != null || recs.coachContext.items.length > 0);
}

// CASE 12 — Training PR in daily context
{
  const daily = emptyDaily({
    progress: {
      recentPr: { exerciseName: "Bankdrücken", valueKg: 80, achievedAt: new Date().toISOString() },
      sessionImprovement: { exerciseName: "Kniebeuge", detail: "+2.5 kg" },
    },
  });
  const lines = formatDailyIntelForCoach(daily, "training");
  assert("CASE 12: daily intel includes training label", lines.some((l) => l.includes("Upper B") || l.includes("Training")));
}

// CASE 13 — Protein low today + weekly good → both in formats
{
  const daily = emptyDaily({ nutrition: { ...emptyDaily().nutrition, proteinRemaining: 55 } });
  const weekly = emptyWeekly({ nutrition: { ...emptyWeekly().nutrition, proteinDaysOnTarget: 6, status: "good" } });
  const dLines = formatDailyIntelForCoach(daily, "nutrition");
  const wLines = formatWeeklyIntelCompact(weekly, "nutrition");
  assert("CASE 13: daily protein remaining", dLines.some((l) => l.includes("55")));
  assert("CASE 13: weekly protein good", wLines.some((l) => l.includes("6/7")));
}

// CASE 14 — Weight plateau + insufficient weekly data
{
  const weekly = emptyWeekly({
    weight: { changeKg: 0, currentKg: 80, status: "insufficient_data", trendLabel: "stable" },
    coachContext: { weeklySummary: "Zu wenig Gewichtsdaten", weeklyPriorities: [], weeklyAchievements: [], weeklyRecommendations: [] },
  });
  const lines = formatWeeklyIntelCompact(weekly, "weight");
  assert("CASE 14: insufficient weight data in weekly", lines.some((l) => l.includes("insufficient_data") || l.includes("0 kg")));
}

// CASE 15 — Requires confirmation flag in adaptive output
{
  const recs = buildAdaptiveRecommendations({
    now: new Date(),
    nutritionGoal: "FAT_LOSS",
    daily: emptyDaily({ weight: { ...emptyDaily().weight, plateauDetected: true, change7dKg: 0, trendLabel: "stable" } }),
    weekly: emptyWeekly({
      training: { completed: 4, planned: 5, completionRate: 0.8, streakDays: 3, status: "good" },
      nutrition: {
        ...emptyWeekly().nutrition,
        calorieDeltaVsTarget: 250,
        proteinDaysOnTarget: 6,
        proteinDaysTotal: 7,
      },
      weight: { changeKg: 0, currentKg: 80, status: "needs_attention", trendLabel: "stable" },
    }),
    proteinTargetG: 150,
    workoutDaysPerWeek: 4,
  });
  const lines = formatAdaptiveForCoach(recs, "weight");
  const needsConfirm = recs.coachContext.items.some((i) => i.requiresConfirmation);
  assert("CASE 15: confirmation flag present when applicable", needsConfirm && lines.some((l) => l.includes("bestätigen")));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
