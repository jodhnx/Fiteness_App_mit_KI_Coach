/**
 * Nutrition streak calendar-day semantics.
 * Run: npx tsx scripts/test-nutrition-streak.ts
 */
import { effectiveNutritionStreakDays } from "../src/lib/nutrition-streak";

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
      { currentDays: 3, longestDays: 5, lastTrackedAt: new Date("2026-09-10T08:00:00") },
      now
    ) === 3
  );
  assert(
    "yesterday still effective (gap 1)",
    effectiveNutritionStreakDays(
      { currentDays: 2, longestDays: 2, lastTrackedAt: new Date("2026-09-09T20:00:00") },
      now
    ) === 2
  );
  assert(
    "skipped day resets effective to 0",
    effectiveNutritionStreakDays(
      { currentDays: 4, longestDays: 4, lastTrackedAt: new Date("2026-09-08T12:00:00") },
      now
    ) === 0
  );
  assert(
    "null row is 0",
    effectiveNutritionStreakDays(null, now) === 0
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
