/**
 * Science-based nutrition target tests.
 * Run: npx tsx scripts/test-nutrition-targets.ts
 */
import {
  calculateNutritionTargets,
  computeCaloriePlan,
} from "../src/lib/calorie-target";
import {
  areStoredMacrosPlausible,
  calculateMacros,
  isProteinTargetAggressive,
  MAX_SUGGESTED_PROTEIN_G,
  proteinGramsPerKg,
  sanitizeWeightKgForTargets,
} from "../src/lib/nutrition-macros";
import type { Gender, NutritionGoal, TrainingGoal } from "@prisma/client";

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

function macroKcal(p: number, c: number, f: number) {
  return p * 4 + c * 4 + f * 9;
}

function baseUser(weightKg: number) {
  return {
    age: 28,
    weightKg,
    heightCm: 178,
    gender: "MALE" as Gender,
    activityLevel: "MODERATE" as const,
    workoutDaysPerWeek: 4,
  };
}

const GOALS: {
  nutritionGoal: NutritionGoal;
  trainingGoal: TrainingGoal;
  label: string;
}[] = [
  { nutritionGoal: "FAT_LOSS", trainingGoal: "LOSE_WEIGHT", label: "CUT" },
  {
    nutritionGoal: "MAINTENANCE",
    trainingGoal: "MAINTAIN",
    label: "MAINTENANCE",
  },
  { nutritionGoal: "MUSCLE_GAIN", trainingGoal: "GAIN_MUSCLE", label: "BULK" },
];

console.log("Nutrition Targets — science-based macros\n");

for (const weight of [60, 70, 80, 100]) {
  console.log(`\nWeight ${weight} kg`);
  for (const g of GOALS) {
    const targets = calculateNutritionTargets({
      ...baseUser(weight),
      nutritionGoal: g.nutritionGoal,
      trainingGoal: g.trainingGoal,
    });
    assert(`${g.label} computes`, targets != null);
    if (!targets) continue;

    const pMin = Math.round(weight * 1.4);
    const pMax = Math.min(Math.round(weight * 2.4), MAX_SUGGESTED_PROTEIN_G);
    assert(
      `${g.label} protein in ${pMin}–${pMax}g`,
      targets.protein >= pMin && targets.protein <= pMax,
      `got ${targets.protein}g`
    );
    assert(
      `${g.label} protein never ≥300g`,
      targets.protein < 300,
      `got ${targets.protein}g`
    );
    assert(
      `${g.label} protein never ≥500g`,
      targets.protein < 500,
      `got ${targets.protein}g`
    );

    const fMin = Math.round(weight * 0.5);
    const fMax = Math.min(Math.round(weight * 1.2), 150);
    assert(
      `${g.label} fat plausible`,
      targets.fat >= fMin && targets.fat <= fMax,
      `got ${targets.fat}g`
    );
    assert(`${g.label} carbs ≥ 0`, targets.carbs >= 0);
    assert(
      `${g.label} calories 1200–5500`,
      targets.calories >= 1200 && targets.calories <= 5500,
      `got ${targets.calories}`
    );

    const mk = macroKcal(targets.protein, targets.carbs, targets.fat);
    const drift = Math.abs(mk - targets.calories);
    assert(
      `${g.label} macros ≈ calories (±120)`,
      drift <= 120,
      `kcal=${targets.calories} macros=${mk} drift=${drift}`
    );
  }
}

console.log("\nGoal ordering (80 kg)");
{
  const cut = calculateNutritionTargets({
    ...baseUser(80),
    nutritionGoal: "FAT_LOSS",
    trainingGoal: "LOSE_WEIGHT",
  })!;
  const maint = calculateNutritionTargets({
    ...baseUser(80),
    nutritionGoal: "MAINTENANCE",
    trainingGoal: "MAINTAIN",
  })!;
  const bulk = calculateNutritionTargets({
    ...baseUser(80),
    nutritionGoal: "MUSCLE_GAIN",
    trainingGoal: "GAIN_MUSCLE",
  })!;
  assert("cut < maintenance", cut.calories < maint.calories);
  assert("maintenance < bulk", maint.calories < bulk.calories);
  assert(
    "cut protein ≥ maintenance protein (retention)",
    cut.protein >= maint.protein - 5
  );
}

console.log("\nInvalid / edge inputs");
assert("missing weight → null", calculateNutritionTargets({
  ...baseUser(0),
  weightKg: 0,
  nutritionGoal: "MAINTENANCE",
}) == null);
assert(
  "tiny weight sanitized null",
  sanitizeWeightKgForTargets(20) == null
);
assert(
  "huge weight sanitized null",
  sanitizeWeightKgForTargets(400) == null
);
assert(
  "calculateMacros without weight clamps protein",
  calculateMacros(8000, "GAIN_MUSCLE", "MUSCLE_GAIN", null).proteinG <=
    MAX_SUGGESTED_PROTEIN_G
);

const extremeStored = areStoredMacrosPlausible({
  calories: 2500,
  proteinG: 500,
  carbsG: 200,
  fatG: 70,
  weightKg: 80,
});
assert("500g protein stored rejected", extremeStored === false);

const okStored = areStoredMacrosPlausible({
  calories: 2500,
  proteinG: 160,
  carbsG: 250,
  fatG: 70,
  weightKg: 80,
});
assert("plausible stored macros accepted", okStored === true);

assert(
  "aggressive protein warning at 300g",
  isProteinTargetAggressive(300, 80) === true
);
assert(
  "normal protein no warning",
  isProteinTargetAggressive(160, 80) === false
);

assert(
  "protein g/kg cut > maintenance",
  proteinGramsPerKg("FAT_LOSS", "LOSE_WEIGHT") >
    proteinGramsPerKg("MAINTENANCE", "MAINTAIN")
);

const absurdPlan = computeCaloriePlan({
  age: 28,
  weightKg: 80,
  heightCm: 180,
  gender: "MALE",
  activityLevel: "VERY_ACTIVE",
  nutritionGoal: "MUSCLE_GAIN",
  trainingGoal: "GAIN_MUSCLE",
  workoutDaysPerWeek: 7,
  context: {
    averageDailySteps: 20_000,
    averageActiveMinutes: 120,
  },
});
assert(
  "even max bonuses stay ≤5500",
  absurdPlan.calorieTarget <= 5500,
  `got ${absurdPlan.calorieTarget}`
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
