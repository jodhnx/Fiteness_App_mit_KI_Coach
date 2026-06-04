import { isValid } from "date-fns";

/** Prisma Profile scalar fields allowed via settings PATCH */
export const PROFILE_PATCH_KEYS = [
  "age",
  "weightKg",
  "heightCm",
  "gender",
  "activityLevel",
  "trainingGoal",
  "nutritionGoal",
  "experienceLevel",
  "workoutDaysPerWeek",
  "calorieTarget",
  "proteinTargetG",
  "carbsTargetG",
  "fatTargetG",
  "waterTargetMl",
  "bio",
  "targetWeightKg",
  "targetWeightDate",
  "bodyFatPct",
  "muscleMassKg",
  "neckCm",
  "chestCm",
  "waistCm",
  "hipsCm",
] as const;

export type ProfilePatchKey = (typeof PROFILE_PATCH_KEYS)[number];

export function pickProfilePatch(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PROFILE_PATCH_KEYS) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  if (out.targetWeightDate instanceof Date && !isValid(out.targetWeightDate)) {
    delete out.targetWeightDate;
  }
  if (out.targetWeightDate === null) {
    out.targetWeightDate = null;
  }
  return out;
}

export function nullableNumberFields(
  patch: Record<string, unknown>,
  keys: ProfilePatchKey[]
): Record<string, unknown> {
  const out = { ...patch };
  for (const key of keys) {
    if (out[key] === undefined) continue;
    if (out[key] === null || out[key] === "") {
      out[key] = null;
    }
  }
  return out;
}

export function buildProfileUpsertData(
  userId: string,
  merged: Record<string, unknown>
): { create: Record<string, unknown>; update: Record<string, unknown> } {
  const picked = pickProfilePatch(merged);
  const vitals = nullableNumberFields(picked, [
    "bodyFatPct",
    "muscleMassKg",
    "neckCm",
    "chestCm",
    "waistCm",
    "hipsCm",
    "targetWeightKg",
  ]);
  return {
    create: { userId, ...vitals },
    update: vitals,
  };
}
