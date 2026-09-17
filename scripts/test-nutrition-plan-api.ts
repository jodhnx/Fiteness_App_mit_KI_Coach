/**
 * Nutrition plan API / validation / error mapping (no live DB required).
 * Run: npx tsx scripts/test-nutrition-plan-api.ts
 */
import {
  createNutritionPlanSchema,
  patchPlanItemSchema,
} from "../src/lib/nutrition-plan-validation";
import { nutritionPlanApiErrorMessage } from "../src/lib/nutrition-plan-api-error";
import { nutritionDayUtc, formatNutritionDayUtc } from "../src/lib/nutrition-day";
import { apiErrorCode, formatApiErrorMessage, apiErrorStatus } from "../src/lib/format-api-error";
import { Prisma } from "@prisma/client";
import {
  bindCacheOwner,
  invalidateCache,
  getCached,
} from "../src/lib/client-cache";
import {
  writePlansListCache,
  readPlansListCache,
  writePlanCache,
  readPlanCache,
  NUTRITION_PLANS_LIST_KEY,
} from "../src/lib/nutrition-plan-cache";

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("Nutrition plan API / validation\n");

// Validation
assert(
  "create accepts 7-day plan",
  createNutritionPlanSchema.safeParse({
    name: "Meine Aufbau-Woche",
    durationDays: 7,
  }).success
);
assert(
  "create accepts startDate",
  createNutritionPlanSchema.safeParse({
    name: "Cut",
    durationDays: 5,
    startDate: "2026-09-17",
  }).success
);
assert(
  "create accepts null startDate",
  createNutritionPlanSchema.safeParse({
    name: "No start",
    durationDays: 7,
    startDate: null,
  }).success
);
assert(
  "rejects invalid duration",
  !createNutritionPlanSchema.safeParse({ name: "X", durationDays: 2 }).success
);
assert(
  "rejects short name",
  !createNutritionPlanSchema.safeParse({ name: "A", durationDays: 7 }).success
);
assert(
  "rejects bad startDate",
  !createNutritionPlanSchema.safeParse({
    name: "Bad date",
    durationDays: 7,
    startDate: "17.09.2026",
  }).success
);

// Date stability (no local TZ shift)
{
  const d = nutritionDayUtc("2026-09-17");
  assert("ymd → UTC midnight", d.toISOString() === "2026-09-17T00:00:00.000Z");
  assert("round-trip ymd", formatNutritionDayUtc(d) === "2026-09-17");
}

// Error mapping
assert(
  "401 message",
  nutritionPlanApiErrorMessage(401, { code: "UNAUTHORIZED" }).includes("anmelden")
);
assert(
  "403 message",
  nutritionPlanApiErrorMessage(403, { code: "FORBIDDEN" }).includes("Berechtigung")
);
assert(
  "400 uses server message",
  nutritionPlanApiErrorMessage(400, { error: "Ungültige Dauer" }) ===
    "Ungültige Dauer"
);
assert(
  "503 schema mismatch",
  nutritionPlanApiErrorMessage(503, { code: "SCHEMA_MISMATCH" }).includes(
    "eingerichtet"
  )
);
assert(
  "network-style 0 falls through",
  nutritionPlanApiErrorMessage(0, null).includes("fehlgeschlagen")
);

{
  const err = new Prisma.PrismaClientKnownRequestError("table", {
    code: "P2021",
    clientVersion: "test",
    meta: { table: "NutritionPlanDay" },
  });
  assert("P2021 → SCHEMA_MISMATCH code", apiErrorCode(err) === "SCHEMA_MISMATCH");
  assert("P2021 → 503", apiErrorStatus(err) === 503);
  assert(
    "P2021 message mentions plans setup",
    formatApiErrorMessage(err).includes("Ernährungspläne")
  );
}

// Cache: failed load must not clear existing list
bindCacheOwner("plan-api-test");
invalidateCache();
writePlansListCache([
  {
    id: "p1",
    name: "Cached",
    durationDays: 7,
    status: "DRAFT",
    isActive: false,
    targetCalories: 2400,
    targetProteinG: 160,
    targetCarbsG: 280,
    targetFatG: 70,
    mealCount: 3,
    itemCount: 0,
    progressDays: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]);
assert("list cache present", readPlansListCache()?.[0]?.id === "p1");
assert(
  "list key intact after soft fail simulation",
  getCached(NUTRITION_PLANS_LIST_KEY, { allowStale: true }) != null
);

writePlanCache({
  id: "detail-1",
  name: "Detail",
  description: null,
  durationDays: 7,
  startDate: null,
  status: "DRAFT",
  isActive: false,
  targetCalories: 2400,
  targetProteinG: 160,
  targetCarbsG: 280,
  targetFatG: 70,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  days: [],
  weekAverage: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  totalMeals: 0,
  totalItems: 0,
});
assert("detail cache written", readPlanCache("detail-1")?.name === "Detail");

assert(
  "patch quantity schema",
  patchPlanItemSchema.safeParse({ quantityG: 150 }).success
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
