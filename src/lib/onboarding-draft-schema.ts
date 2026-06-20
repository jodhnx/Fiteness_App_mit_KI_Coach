import { z } from "zod";

export const onboardingDraftSchema = z.object({
  name: z.string().trim().min(2).max(100),
  age: z.coerce.number().int().min(14).max(100),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
  heightCm: z.coerce.number().positive().max(250),
  weightKg: z.coerce.number().positive().max(300),
  targetWeightKg: z.coerce.number().positive().max(300).nullable().optional(),
  mainGoalKey: z.enum([
    "GAIN_MUSCLE",
    "LOSE_WEIGHT",
    "RECOMP",
    "STRENGTH",
    "ENDURANCE",
    "GENERAL_FITNESS",
  ]),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"]),
  location: z.enum(["GYM", "HOME", "BOTH"]).optional(),
  experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  workoutDaysPerWeek: z.coerce.number().int().min(1).max(7),
  pace: z.enum(["SLOW", "MODERATE", "FAST"]),
}).transform((d) => ({
  ...d,
  targetWeightKg: d.targetWeightKg ?? null,
  location: d.location ?? ("GYM" as const),
}));
