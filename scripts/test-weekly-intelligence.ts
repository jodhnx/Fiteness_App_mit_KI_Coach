/**
 * Lightweight smoke tests for Weekly Intelligence (no DB, no test runner).
 * Run: npx tsx scripts/test-weekly-intelligence.ts
 */
import { buildWeeklyIntelligenceFromContext } from "../src/lib/intelligence/weekly/build-from-context";
import type { WeeklyIntelligenceContext } from "../src/lib/intelligence/weekly/context";
import type { WeeklyReport } from "../src/lib/weekly-report";

function baseReport(overrides: Partial<WeeklyReport> = {}): WeeklyReport {
  return {
    weekLabel: "KW 34",
    generatedAt: new Date().toISOString(),
    workouts: 0,
    avgProteinG: 120,
    avgCaloriesKcal: 2000,
    proteinDaysOnTarget: 0,
    proteinDaysTotal: 0,
    totalSteps: 0,
    avgSleepHours: null,
    sleepNightsLogged: 0,
    activityCount: 0,
    weightChangeKg: null,
    goalReached: false,
    summaryLine: "",
    aiSummary: "",
    ...overrides,
  };
}

function ctx(partial: Partial<WeeklyIntelligenceContext>): WeeklyIntelligenceContext {
  return {
    now: new Date(),
    weekLabel: "KW 34",
    weeklyReport: baseReport(),
    plannedWorkoutsPerWeek: 5,
    nutritionGoal: "FAT_LOSS",
    trainingGoal: null,
    calorieTarget: 2200,
    proteinTarget: 150,
    trainingStreakDays: 0,
    prsThisWeek: [],
    sessionImprovement: null,
    currentWeightKg: 80,
    ...partial,
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

// CASE 1: 5/5 trainings
{
  const intel = buildWeeklyIntelligenceFromContext(
    ctx({
      weeklyReport: baseReport({ workouts: 5 }),
      plannedWorkoutsPerWeek: 5,
    })
  );
  assert("CASE 1: 5/5 training good", intel.training.status === "good");
  assert("CASE 1: primary mentions 5/5", intel.primary?.description.includes("5 von 5") ?? false);
}

// CASE 2: 2/5 trainings
{
  const intel = buildWeeklyIntelligenceFromContext(
    ctx({
      weeklyReport: baseReport({ workouts: 2 }),
      plannedWorkoutsPerWeek: 5,
    })
  );
  assert("CASE 2: 2/5 needs attention", intel.training.status === "needs_attention");
  assert(
    "CASE 2: has plan recommendation",
    Boolean(
      intel.recommendations.some((r) => r.id.includes("plan")) ||
        intel.primary?.description.includes("2 von 5")
    )
  );
}

// CASE 3: protein 6/7
{
  const intel = buildWeeklyIntelligenceFromContext(
    ctx({
      weeklyReport: baseReport({
        proteinDaysOnTarget: 6,
        proteinDaysTotal: 7,
        avgProteinG: 155,
        avgCaloriesKcal: 2100,
      }),
    })
  );
  assert("CASE 3: protein good", intel.nutrition.status === "good");
  assert("CASE 3: protein line", intel.secondary.some((s) => s.description.includes("6 von 7")) || intel.primary?.description.includes("6 von 7") === true);
}

// CASE 4: protein 2/7
{
  const intel = buildWeeklyIntelligenceFromContext(
    ctx({
      weeklyReport: baseReport({
        proteinDaysOnTarget: 2,
        proteinDaysTotal: 7,
        avgProteinG: 90,
        avgCaloriesKcal: 2100,
      }),
    })
  );
  assert("CASE 4: protein needs attention", intel.nutrition.status === "needs_attention");
  assert(
    "CASE 4: protein recommendation",
    intel.recommendations.some((r) => r.id.includes("protein-rec"))
  );
}

// CASE 5: new PR
{
  const intel = buildWeeklyIntelligenceFromContext(
    ctx({
      weeklyReport: baseReport({ workouts: 3 }),
      prsThisWeek: [
        { exerciseName: "Bench Press", weightKg: 100, achievedAt: new Date() },
      ],
    })
  );
  assert("CASE 5: PR achievement", intel.achievements.some((a) => a.type === "pr"));
  assert("CASE 5: progress positive", intel.progress.status === "positive");
}

// CASE 6: insufficient weight
{
  const intel = buildWeeklyIntelligenceFromContext(
    ctx({
      weeklyReport: baseReport({ weightChangeKg: null }),
    })
  );
  assert("CASE 6: weight insufficient", intel.weight.status === "insufficient_data");
}

// CASE 7: weight toward goal (fat loss, down)
{
  const intel = buildWeeklyIntelligenceFromContext(
    ctx({
      nutritionGoal: "FAT_LOSS",
      weeklyReport: baseReport({ weightChangeKg: -0.4 }),
    })
  );
  assert("CASE 7: weight on track", intel.weight.status === "on_track");
}

// CASE 8: sparse week — no invented summary
{
  const intel = buildWeeklyIntelligenceFromContext(
    ctx({
      plannedWorkoutsPerWeek: null,
      weeklyReport: baseReport({
        workouts: 0,
        proteinDaysTotal: 0,
        weightChangeKg: null,
      }),
    })
  );
  assert("CASE 8: training insufficient", intel.training.status === "insufficient_data");
  assert("CASE 8: nutrition insufficient", intel.nutrition.status === "insufficient_data");
  assert("CASE 8: no fake primary protein", !intel.primary?.description.includes("Protein an"));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
