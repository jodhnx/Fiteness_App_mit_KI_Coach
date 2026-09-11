/**
 * Client validation helpers for settings profile edit — no network.
 * Run: npx tsx scripts/test-settings-profile-edit.ts
 */
import assert from "node:assert/strict";
import { validateProfileEditForm, type ProfileEditForm } from "../src/components/settings/settings-profile-edit-sheet";

function base(over: Partial<ProfileEditForm> = {}): ProfileEditForm {
  return {
    name: "Test User",
    username: "test",
    email: "t@example.com",
    age: "28",
    weightKg: "80",
    heightCm: "182",
    gender: "MALE",
    activityLevel: "MODERATE",
    trainingGoal: "GAIN_MUSCLE",
    nutritionGoal: "MUSCLE_GAIN",
    experienceLevel: "INTERMEDIATE",
    workoutDaysPerWeek: "4",
    calorieTarget: "2300",
    proteinTargetG: "180",
    carbsTargetG: "250",
    fatTargetG: "70",
    waterTargetMl: "2500",
    targetWeightKg: "85",
    targetWeightDate: "",
    trainingLocation: "GYM",
    countryCode: "AT",
    bodyFatPct: "",
    muscleMassKg: "",
    neckCm: "",
    chestCm: "",
    waistCm: "",
    hipsCm: "",
    ...over,
  };
}

console.log("Settings profile edit validation");

{
  const e = validateProfileEditForm(base());
  assert.equal(Object.keys(e).length, 0);
  console.log("  ✓ valid profile");
}

{
  const e = validateProfileEditForm(base({ age: "5" }));
  assert.ok(e.age);
  console.log("  ✓ rejects too-young age");
}

{
  const e = validateProfileEditForm(base({ heightCm: "50" }));
  assert.ok(e.heightCm);
  console.log("  ✓ rejects absurd height");
}

{
  const e = validateProfileEditForm(base({ weightKg: "5" }));
  assert.ok(e.weightKg);
  console.log("  ✓ rejects absurd weight");
}

{
  const e = validateProfileEditForm(base({ calorieTarget: "145284" }));
  assert.ok(e.calorieTarget);
  console.log("  ✓ rejects millicalorie-like target");
}

{
  const e = validateProfileEditForm(base({ calorieTarget: "2400" }));
  assert.equal(e.calorieTarget, undefined);
  console.log("  ✓ accepts normal kcal");
}

{
  const e = validateProfileEditForm(base({ name: "A" }));
  assert.ok(e.name);
  console.log("  ✓ rejects short name");
}

{
  const e = validateProfileEditForm(base({ proteinTargetG: "-1" }));
  assert.ok(e.proteinTargetG);
  console.log("  ✓ rejects negative protein");
}

console.log("\nAll settings profile edit tests passed.");
