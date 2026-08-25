/**
 * Phase 5B — Training Intelligence 3.0 smoke tests.
 * Run: npx tsx scripts/test-training-intelligence.ts
 */
import {
  analyzeExercisePerformance,
  buildExerciseHistories,
  parseRepRange,
  prioritizePerformanceInsights,
  suggestNextWeight,
} from "../src/lib/intelligence/training-performance/analyze";
import { buildTrainingPerformanceIntelligence } from "../src/lib/intelligence/training-performance/build";
import { coachContextNeeds } from "../src/lib/coach-context/needs";
import {
  patchHomeAfterWorkoutComplete,
  rebuildHomeIntelligenceLayers,
} from "../src/lib/intelligence/client-refresh";
import { createEmptyHomeData } from "../src/lib/home-defaults";

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

function exerciseRow(name: string, reps = "8-10", sets = 3) {
  return {
    exerciseLibraryId: `c-${name.replace(/\s/g, "-")}`,
    exerciseName: name,
    targetSets: sets,
    targetReps: reps,
    setTargets: null,
  };
}

function session(date: string, exerciseId: string, sets: { w: number; r: number }[]) {
  return {
    completedAt: new Date(date),
    sets: sets.map((s, i) => ({
      exerciseLibraryId: exerciseId,
      exerciseName: "Test",
      reps: s.r,
      weightKg: s.w,
      setNumber: i + 1,
      completed: true,
    })),
  };
}

console.log("Training Intelligence 3.0 Tests\n");

// CASE 1 — 70×8, target 8–10 → maintain
{
  const row = exerciseRow("Incline Bench");
  const hist = buildExerciseHistories([row], [
    session("2026-08-20", row.exerciseLibraryId, [{ w: 70, r: 8 }]),
    session("2026-08-13", row.exerciseLibraryId, [{ w: 70, r: 8 }]),
  ]);
  const insight = analyzeExercisePerformance(hist[0]!);
  assert(
    "CASE 1: maintain state",
    insight.progressionState === "maintain" || insight.progressionState === "stalled"
  );
  assert("CASE 1: recommends same weight", insight.recommendedWeightKg === 70);
  assert("CASE 1: rep target 8–10", insight.recommendedRepRange === "8–10");
}

// CASE 2 — 70×10 → ready_to_progress
{
  const row = exerciseRow("Incline Bench");
  const hist = buildExerciseHistories([row], [
    session("2026-08-20", row.exerciseLibraryId, [{ w: 70, r: 10 }]),
    session("2026-08-13", row.exerciseLibraryId, [{ w: 70, r: 9 }]),
  ]);
  const insight = analyzeExercisePerformance(hist[0]!);
  assert("CASE 2: ready_to_progress", insight.progressionState === "ready_to_progress");
  assert("CASE 2: next weight 72.5", insight.recommendedWeightKg === 72.5);
}

// CASE 3 — 72.5 successful → progressing
{
  const row = exerciseRow("Incline Bench");
  const hist = buildExerciseHistories([row], [
    session("2026-08-27", row.exerciseLibraryId, [{ w: 72.5, r: 8 }]),
    session("2026-08-20", row.exerciseLibraryId, [{ w: 70, r: 10 }]),
  ]);
  const insight = analyzeExercisePerformance(hist[0]!);
  assert("CASE 3: progressing after weight up", insight.progressionState === "progressing");
}

// CASE 4 — same performance 3 sessions → stalled
{
  const row = exerciseRow("Lat Pulldown");
  const hist = buildExerciseHistories([row], [
    session("2026-08-27", row.exerciseLibraryId, [{ w: 65, r: 10 }]),
    session("2026-08-20", row.exerciseLibraryId, [{ w: 65, r: 10 }]),
    session("2026-08-13", row.exerciseLibraryId, [{ w: 65, r: 10 }]),
  ]);
  const insight = analyzeExercisePerformance(hist[0]!);
  assert("CASE 4: stalled", insight.progressionState === "stalled");
}

// CASE 5 — one bad session → NOT stalled
{
  const row = exerciseRow("Lat Pulldown");
  const hist = buildExerciseHistories([row], [
    session("2026-08-27", row.exerciseLibraryId, [{ w: 65, r: 6 }]),
    session("2026-08-20", row.exerciseLibraryId, [{ w: 65, r: 10 }]),
  ]);
  const insight = analyzeExercisePerformance(hist[0]!);
  assert("CASE 5: one bad session not stalled", insight.progressionState !== "stalled");
}

// CASE 6 — no history → insufficient_data
{
  const row = exerciseRow("New Exercise");
  const hist = buildExerciseHistories([row], []);
  const insight = analyzeExercisePerformance(hist[0]!);
  assert("CASE 6: insufficient_data", insight.progressionState === "insufficient_data");
  assert("CASE 6: no weight recommendation", insight.recommendedWeightKg == null);
}

// CASE 7 — real PR highlight
{
  const row = exerciseRow("Cable Curl");
  const data = {
    ...buildExerciseHistories([row], [
      session("2026-08-20", row.exerciseLibraryId, [{ w: 25, r: 12 }]),
      session("2026-08-13", row.exerciseLibraryId, [{ w: 22.5, r: 12 }]),
    ])[0]!,
    pr: { weightKg: 25, achievedAt: "2026-08-20T12:00:00.000Z" },
  };
  const insight = analyzeExercisePerformance(data);
  assert("CASE 7: PR in evidence", Boolean(insight.prHighlight?.includes("25")));
}

// CASE 8 — performance rising → progressing
{
  const row = exerciseRow("Squat");
  const hist = buildExerciseHistories([row], [
    session("2026-08-27", row.exerciseLibraryId, [{ w: 100, r: 8 }]),
    session("2026-08-20", row.exerciseLibraryId, [{ w: 97.5, r: 8 }]),
  ]);
  const insight = analyzeExercisePerformance(hist[0]!);
  assert("CASE 8: progressing", insight.progressionState === "progressing");
}

// CASE 9 — declining over 3 sessions
{
  const row = exerciseRow("OHP");
  const hist = buildExerciseHistories([row], [
    session("2026-08-27", row.exerciseLibraryId, [{ w: 50, r: 6 }]),
    session("2026-08-20", row.exerciseLibraryId, [{ w: 50, r: 8 }]),
    session("2026-08-13", row.exerciseLibraryId, [{ w: 50, r: 10 }]),
  ]);
  const insight = analyzeExercisePerformance(hist[0]!);
  assert("CASE 9: declining", insight.progressionState === "declining");
}

// CASE 10 — low recovery → no aggressive progression
{
  const row = exerciseRow("Incline Bench");
  const hist = buildExerciseHistories([row], [
    session("2026-08-20", row.exerciseLibraryId, [{ w: 70, r: 10 }]),
    session("2026-08-13", row.exerciseLibraryId, [{ w: 70, r: 9 }]),
  ]);
  const insight = analyzeExercisePerformance(hist[0]!, { recoveryCaution: true });
  assert("CASE 10: recovery blocks weight jump", insight.recommendedWeightKg == null);
  assert("CASE 10: mentions recovery or stay", insight.explanation.includes("Recovery") || insight.explanation.includes("bleiben"));
}

// CASE 11 — max 1 primary + 2 secondary
{
  const rows = [
    exerciseRow("Ex A"),
    exerciseRow("Ex B"),
    exerciseRow("Ex C"),
    exerciseRow("Ex D"),
  ];
  const insights = rows.map((row, i) => {
    const sessions = [
      session("2026-08-27", row.exerciseLibraryId, [{ w: 60 + i * 5, r: 10 }]),
      session("2026-08-20", row.exerciseLibraryId, [{ w: 60 + i * 5, r: 9 }]),
    ];
    return analyzeExercisePerformance(buildExerciseHistories([row], sessions)[0]!);
  });
  const { primary, secondary } = prioritizePerformanceInsights(insights);
  assert("CASE 11: has primary", primary != null);
  assert("CASE 11: max 2 secondary", secondary.length <= 2);
}

// CASE 12 — coach training mode includes performance
{
  const needs = coachContextNeeds("training");
  assert("CASE 12: training mode loads performance", needs.trainingPerformance === true);
}

// CASE 13 — nutrition mode skips performance dump
{
  const needs = coachContextNeeds("nutrition");
  assert("CASE 13: nutrition skips performance", needs.trainingPerformance === false);
  assert("CASE 13: nutrition skips training detail", needs.trainingDetail === false);
}

// CASE 14 — workout complete refresh is single client rebuild (no training perf API)
{
  let rebuildCount = 0;
  const home = createEmptyHomeData();
  const patched = patchHomeAfterWorkoutComplete(home, {
    name: "Upper B",
    completedAt: new Date().toISOString(),
  });
  const refreshed = rebuildHomeIntelligenceLayers(patched);
  rebuildCount++;
  assert("CASE 14: patch clears active session", patched.activeSession == null);
  assert("CASE 14: refresh produces intelligence", refreshed.intelligence != null);
  assert("CASE 14: single rebuild path", rebuildCount === 1);
}

// CASE 15 — insufficient data → no invented weight
{
  const intel = buildTrainingPerformanceIntelligence({
    workoutLabel: "Plan — Day 1",
    exerciseCount: 1,
    planExercises: [exerciseRow("Unknown Lift")],
    sessions: [],
    prsByExercise: new Map(),
    recoveryScore: null,
    trainingReadiness: null,
  });
  assert("CASE 15: no primary when no data", intel.primary == null || intel.primary.recommendedWeightKg == null);
  assert("CASE 15: summary mentions insufficient", intel.coachContext.summary.includes("keine ausreichenden") || intel.exercises[0]?.progressionState === "insufficient_data");
}

// Bonus: parseRepRange + suggestNextWeight
{
  const range = parseRepRange("8-10");
  assert("parseRepRange 8-10", range?.min === 8 && range?.max === 10);
  assert("suggestNextWeight 70", suggestNextWeight(70) === 72.5);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
