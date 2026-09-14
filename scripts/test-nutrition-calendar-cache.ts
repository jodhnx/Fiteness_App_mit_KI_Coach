/**
 * Nutrition calendar cache key isolation helpers.
 * Run: npx tsx scripts/test-nutrition-calendar-cache.ts
 */
import {
  nutritionDashboardCacheKeyForDay,
  yearMonthKey,
  isNutritionToday,
} from "../src/lib/nutrition-calendar";

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

console.log("Nutrition Calendar Cache Tests\n");

assert(
  "day keys differ",
  nutritionDashboardCacheKeyForDay("2026-09-01") !==
    nutritionDashboardCacheKeyForDay("2026-09-02")
);
assert(
  "month key format",
  yearMonthKey(2026, 8) === "2026-09"
);
assert(
  "today helper false for past",
  isNutritionToday("2020-01-01") === false
);

const a = nutritionDashboardCacheKeyForDay("2026-08-15");
const b = nutritionDashboardCacheKeyForDay("2026-08-15");
assert("same day same key", a === b);
assert("keys include ymd", a.includes("2026-08-15"));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
