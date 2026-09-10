/**
 * Training domain tests: volume, PRs, completion idempotency, inputs, rest timer, cache isolation.
 * Run: npx tsx scripts/test-workout-metrics.ts
 */

import {
  computePRUpdates,
  sessionCompletedVolume,
  setVolume,
  shouldApplyCompletionRewards,
  isLibraryExerciseId,
} from "../src/lib/workout-metrics";
import {
  parseReps,
  parseWeightKg,
  sanitizeWeightInput,
  formatLastPerformance,
  formatWorkoutClock,
  isNewWeightPr,
  lastPerformanceLines,
  validateCompleteSet,
} from "../src/lib/workout-input";
import {
  addRestSeconds,
  pauseRest,
  remainingRestSec,
  resumeRest,
  startRest,
  normalizeLiveRest,
} from "../src/lib/live-rest-timer";
import { mergeLiveSession, nextSetNumber } from "../src/lib/live-session-draft";
import { parsePlanSetTargets } from "../src/lib/plan-exercise-sets";
import {
  bindCacheOwner,
  getCached,
  setCached,
  setCacheOwner,
} from "../src/lib/client-cache";
import { CACHE_OWNER_STORAGE_KEY } from "../src/lib/persistent-cache";

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

const BENCH = "cbenchpress000000000001";
const SQUAT = "csquat00000000000000001";

console.log("Workout metrics\n");

{
  const sets = [
    { completed: true, reps: 8, weightKg: 80 },
    { completed: true, reps: 8, weightKg: 80 },
    { completed: false, reps: 8, weightKg: 200 },
  ];
  assert("volume ignores incomplete", sessionCompletedVolume(sets) === 1280);
  assert("setVolume", setVolume(8, 80) === 640);
}

{
  const sets = [
    {
      exerciseLibraryId: BENCH,
      exerciseName: "Bench Press",
      setNumber: 1,
      reps: 8,
      weightKg: 100,
      completed: true,
    },
    {
      exerciseLibraryId: SQUAT,
      exerciseName: "Squat",
      setNumber: 1,
      reps: 5,
      weightKg: 140,
      completed: true,
    },
  ];
  const existing = [
    { recordType: "MAX_WEIGHT" as const, value: 110, exerciseLibraryId: BENCH },
  ];
  const updates = computePRUpdates(sets, existing);
  const squatPr = updates.find(
    (u) => u.recordType === "MAX_WEIGHT" && u.exerciseLibraryId === SQUAT
  );
  const benchPr = updates.find(
    (u) => u.recordType === "MAX_WEIGHT" && u.exerciseLibraryId === BENCH
  );
  assert("squat PR not blocked by bench", squatPr != null && squatPr.value === 140);
  assert("bench below existing is not a PR", benchPr == null);
}

{
  const sets = [
    {
      exerciseLibraryId: BENCH,
      exerciseName: "Bench Press",
      setNumber: 1,
      reps: 1,
      weightKg: 200,
      completed: false,
    },
  ];
  assert(
    "incomplete set is not a PR",
    computePRUpdates(sets, []).length === 0
  );
}

{
  assert("first complete awards", shouldApplyCompletionRewards("IN_PROGRESS"));
  assert("second complete is no-op", !shouldApplyCompletionRewards("COMPLETED"));
  assert("cancelled does not award", !shouldApplyCompletionRewards("CANCELLED"));
}

{
  assert("library id", isLibraryExerciseId(BENCH));
  assert("custom name is not library id", !isLibraryExerciseId("Bench Press"));
}

console.log("\nWeight / reps input\n");

{
  assert("20.5 kg", parseWeightKg("20.5") === 20.5);
  assert("comma decimal", parseWeightKg("80,5") === 80.5);
  assert("empty weight", parseWeightKg("") === null);
  assert("invalid weight", parseWeightKg("abc") === null);
  assert("sanitize extra dots", sanitizeWeightInput("20.5.5") === "20.5");
  assert("reps 8", parseReps("8") === 8);
  assert("reps over 100 rejected", parseReps("101") === null);
  assert("reps empty", parseReps("") === null);
}

{
  const line = formatLastPerformance([
    { weightKg: 80, reps: 8, workoutSessionId: "s1" },
    { weightKg: 80, reps: 8, workoutSessionId: "s1" },
    { weightKg: 80, reps: 8, workoutSessionId: "s1" },
  ]);
  assert("last 80 KG × 8", line === "80 KG × 8");
  const zeroLines = lastPerformanceLines([
    { weightKg: 0, reps: 0, workoutSessionId: "s1" },
  ]);
  assert("skips 0 KG × 0", zeroLines.length === 0);
  const lines = lastPerformanceLines([
    { weightKg: 80, reps: 8, workoutSessionId: "s1" },
    { weightKg: 80, reps: 7, workoutSessionId: "s1" },
  ]);
  assert("per-set last lines", lines.join("|") === "80 KG × 8|80 KG × 7");
  const invalid = validateCompleteSet("", "");
  assert("complete requires values", invalid.ok === false);
  const valid = validateCompleteSet("20.5", "8");
  assert("complete 20.5 x 8", valid.ok === true && valid.ok && valid.weightKg === 20.5 && valid.reps === 8);
  assert("clock under 1h", formatWorkoutClock(32 * 60 + 41) === "32:41");
  assert("clock over 1h", formatWorkoutClock(3661) === "1:01:01");
  assert(
    "new PR higher weight",
    isNewWeightPr([{ completed: true, weightKg: 90 }], [{ weightKg: 80 }]) === true
  );
  assert(
    "no PR equal weight",
    isNewWeightPr([{ completed: true, weightKg: 80 }], [{ weightKg: 80 }]) === false
  );
  assert(
    "incomplete not PR",
    isNewWeightPr([{ completed: false, weightKg: 100 }], [{ weightKg: 80 }]) === false
  );
  assert(
    "no live PR without history",
    isNewWeightPr([{ completed: true, weightKg: 80 }], []) === false
  );
}

console.log("\nPlan sets\n");

{
  const parsed = parsePlanSetTargets(
    [{ weightKg: 80, reps: 8 }, { weightKg: 80, reps: 8 }],
    3,
    "8-12"
  );
  assert("does not invent extra plan sets from targetSets", parsed.length === 2);
  assert("keeps real weight", parsed[0]?.weightKg === 80);
  const empty = parsePlanSetTargets(null, 3);
  assert("empty targets stay null weight", empty.every((s) => s.weightKg === null && s.reps === null));
}

console.log("\nRest timer\n");

{
  const now = 1_000_000;
  const running = startRest(90, now);
  assert("start remaining", remainingRestSec(running, now) === 90);
  assert("timestamp remaining after 30s", remainingRestSec(running, now + 30_000) === 60);
  const paused = pauseRest(running, now + 10_000);
  assert("pause remaining ms", paused.remainingMs === 80_000);
  assert("pausedAt set", paused.pausedAt === now + 10_000);
  const resumed = resumeRest(paused, now + 20_000);
  assert("resume continues", remainingRestSec(resumed, now + 20_000) === 80);
  const plus = addRestSeconds(running, 30, now);
  assert("+30s", remainingRestSec(plus, now) === 120);
  const migrated = normalizeLiveRest({ until: now + 45_000, pausedRemainingSec: null }, now);
  assert("migrates old until", migrated != null && remainingRestSec(migrated, now) === 45);
}

console.log("\nResume merge / set numbers\n");

{
  const remote = {
    id: "s1",
    name: "Push",
    startedAt: "2026-09-10T08:00:00.000Z",
    sets: [
      {
        id: "a",
        exerciseLibraryId: "c1",
        exerciseName: "Bench",
        setNumber: 1,
        reps: 8,
        weightKg: 80,
        rpe: null,
        restSeconds: 90,
        completed: true,
        notes: null,
      },
    ],
  };
  const local = {
    ...remote,
    sets: [
      { ...remote.sets[0], weightKg: 82.5, saveState: "pending" as const },
      {
        id: "temp-set-1",
        exerciseLibraryId: "c1",
        exerciseName: "Bench",
        setNumber: 2,
        reps: 8,
        weightKg: 80,
        rpe: null,
        restSeconds: 90,
        completed: false,
        notes: null,
        saveState: "pending" as const,
      },
    ],
  };
  const merged = mergeLiveSession(local, remote);
  assert("keeps pending weight", merged.sets[0]?.weightKg === 82.5);
  assert("keeps temp set", merged.sets.some((s) => s.id === "temp-set-1"));
  assert("next set number", nextSetNumber(merged.sets) === 3);
}

console.log("\nUser isolation (cache)\n");

{
  const mem = new Map<string, string>();
  const localStorageMock = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  };
  (globalThis as unknown as { window: { localStorage: typeof localStorageMock } }).window =
    { localStorage: localStorageMock };
  (globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage =
    localStorageMock;

  mem.set(CACHE_OWNER_STORAGE_KEY, "user-a");
  setCacheOwner("user-a");
  setCached("workouts-active", { session: { id: "a-session" } }, 90_000);
  setCached("workout-history-sessions", { sessions: [{ id: "a-hist" }] }, 90_000);
  assert(
    "A sees A session",
    (getCached<{ session: { id: string } }>("workouts-active")?.session.id ?? "") ===
      "a-session"
  );

  const wiped = bindCacheOwner("user-b");
  assert("owner switch wipes", wiped);
  assert("B does not see A session", getCached("workouts-active") == null);
  assert("B does not see A history", getCached("workout-history-sessions") == null);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
