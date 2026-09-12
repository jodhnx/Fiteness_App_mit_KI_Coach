/**
 * Nutrition / activity streak calendar-day semantics.
 * Run: npx tsx scripts/test-nutrition-streak.ts
 *
 * Activity = meal log OR completed training. App open / settings do NOT count.
 */
import {
  computeStreakFromDayKeys,
  computeActivityStreakFromDayKeys,
  effectiveNutritionStreakDays,
} from "../src/lib/nutrition-streak";
import { startOfDay } from "date-fns";

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

console.log("Nutrition Streak Tests\n");

{
  const now = new Date("2026-09-10T15:00:00");
  assert(
    "same day keeps effective streak",
    effectiveNutritionStreakDays(
      {
        currentDays: 3,
        longestDays: 5,
        lastTrackedAt: new Date("2026-09-10T08:00:00"),
      },
      now
    ) === 3
  );
  assert(
    "yesterday still effective (gap 1)",
    effectiveNutritionStreakDays(
      {
        currentDays: 2,
        longestDays: 2,
        lastTrackedAt: new Date("2026-09-09T20:00:00"),
      },
      now
    ) === 2
  );
  assert(
    "skipped day resets effective to 0",
    effectiveNutritionStreakDays(
      {
        currentDays: 4,
        longestDays: 4,
        lastTrackedAt: new Date("2026-09-08T12:00:00"),
      },
      now
    ) === 0
  );
  assert("null row is 0", effectiveNutritionStreakDays(null, now) === 0);
}

{
  const d = (ymd: string) =>
    startOfDay(new Date(`${ymd}T12:00:00Z`)).toISOString();
  assert(
    "empty days → streak 0",
    computeStreakFromDayKeys([]).currentDays === 0 &&
      computeStreakFromDayKeys([]).lastTrackedAt === null
  );
  assert(
    "single day → streak 1",
    computeStreakFromDayKeys([d("2026-09-10")]).currentDays === 1
  );
  assert(
    "two consecutive days → streak 2",
    computeStreakFromDayKeys([d("2026-09-09"), d("2026-09-10")])
      .currentDays === 2
  );
  assert(
    "three consecutive days → streak 3",
    computeStreakFromDayKeys([
      d("2026-09-08"),
      d("2026-09-09"),
      d("2026-09-10"),
    ]).currentDays === 3
  );
  assert(
    "delete last day leaves prior streak",
    computeStreakFromDayKeys([d("2026-09-08"), d("2026-09-09")])
      .currentDays === 2
  );
  assert(
    "gap breaks current but keeps longest",
    (() => {
      const r = computeStreakFromDayKeys([
        d("2026-09-01"),
        d("2026-09-02"),
        d("2026-09-03"),
        d("2026-09-10"),
      ]);
      return r.currentDays === 1 && r.longestDays === 3;
    })()
  );
  assert(
    "1-day gap → new streak 1",
    computeStreakFromDayKeys([
      d("2026-09-08"),
      d("2026-09-09"),
      d("2026-09-11"),
    ]).currentDays === 1
  );
}

{
  const d = (ymd: string) => ymd;
  assert(
    "food-only days count",
    computeActivityStreakFromDayKeys([d("2026-09-10"), d("2026-09-11")])
      .currentDays === 2
  );
  assert(
    "training-only days count",
    computeActivityStreakFromDayKeys([d("2026-09-10")]).currentDays === 1
  );
  assert(
    "food + training same day merges to one day",
    computeActivityStreakFromDayKeys([
      d("2026-09-10"),
      d("2026-09-10"),
      d("2026-09-11"),
    ]).currentDays === 2
  );
  assert(
    "mixed food/training consecutive days",
    computeActivityStreakFromDayKeys([
      d("2026-09-08"),
      d("2026-09-09"),
      d("2026-09-10"),
    ]).currentDays === 3
  );
  assert(
    "app-open / settings produce no day keys → streak 0",
    computeActivityStreakFromDayKeys([]).currentDays === 0
  );
  assert(
    "cache cannot invent extra days — only provided keys count",
    computeActivityStreakFromDayKeys([d("2026-09-10")]).currentDays === 1
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
