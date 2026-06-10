import { z } from "zod";

const registerEmailSchema = z
  .string()
  .trim()
  .min(1, "Bitte eine gültige E-Mail-Adresse verwenden.")
  .email("Bitte eine gültige E-Mail-Adresse verwenden.");

export const registerSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen haben").max(100),
  email: registerEmailSchema,
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben").max(128),
});

export const verifyEmailSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  code: z
    .string()
    .length(6, "Der Code muss 6 Ziffern haben")
    .regex(/^\d{6}$/, "Der Code darf nur Ziffern enthalten"),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
});

export function validationErrorMessage(
  result: { success: false; error: z.ZodError }
): string {
  return result.error.issues[0]?.message ?? "Ungültige Eingabe";
}

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const resetRequestSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

const genderEnum = z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]);
const activityEnum = z.enum([
  "SEDENTARY",
  "LIGHT",
  "MODERATE",
  "ACTIVE",
  "VERY_ACTIVE",
]);
const trainingGoalEnum = z.enum([
  "LOSE_WEIGHT",
  "MAINTAIN",
  "GAIN_MUSCLE",
  "ENDURANCE",
  "STRENGTH",
  "GENERAL_FITNESS",
]);
const nutritionGoalEnum = z.enum([
  "MUSCLE_GAIN",
  "FAT_LOSS",
  "MAINTENANCE",
  "LEAN_BULK",
  "RECOMP",
]);
const experienceEnum = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO"]);

function emptyToUndefined(val: unknown) {
  if (val === "" || val === null) return undefined;
  return val;
}

function optionalNum(min?: number, max?: number, int = false) {
  let schema = z.coerce.number();
  if (int) schema = schema.int();
  if (min != null) schema = schema.min(min);
  if (max != null) schema = schema.max(max);
  return z.preprocess(emptyToUndefined, schema.optional());
}

export const profileSchema = z.object({
  age: optionalNum(14, 120, true),
  weightKg: optionalNum(1, 500),
  heightCm: optionalNum(1, 300),
  gender: genderEnum.optional(),
  activityLevel: activityEnum.optional(),
  trainingGoal: trainingGoalEnum.optional(),
  nutritionGoal: nutritionGoalEnum.optional(),
  experienceLevel: experienceEnum.optional(),
  workoutDaysPerWeek: optionalNum(2, 6, true),
  calorieTarget: optionalNum(1, 10000, true),
  proteinTargetG: optionalNum(1, 1000, true),
  carbsTargetG: optionalNum(1, 2000, true),
  fatTargetG: optionalNum(1, 500, true),
  waterTargetMl: optionalNum(500, 10000, true),
  bio: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
  targetWeightKg: optionalNum(1, 500),
  targetWeightDate: z.preprocess(
    emptyToUndefined,
    z.string().optional()
  ),
  bodyFatPct: optionalNum(3, 60),
  muscleMassKg: optionalNum(1, 200),
  neckCm: optionalNum(1, 80),
  chestCm: optionalNum(1, 200),
  waistCm: optionalNum(1, 200),
  hipsCm: optionalNum(1, 200),
  manualCalorieTarget: z.boolean().optional(),
});

export const onboardingSchema = z.object({
  gender: z.enum(["MALE", "FEMALE"]),
  age: z.coerce.number().int().min(14).max(100),
  heightCm: z.coerce.number().positive().max(250),
  weightKg: z.coerce.number().positive().max(300),
  activityLevel: activityEnum,
  mainGoalKey: z.enum([
    "GAIN_MUSCLE",
    "LOSE_WEIGHT",
    "RECOMP",
    "STRENGTH",
    "ENDURANCE",
    "GENERAL_FITNESS",
  ]),
  experienceLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  workoutDaysPerWeek: z.coerce.number().int().min(2).max(6).optional(),
  nutritionGoal: nutritionGoalEnum.optional(),
});

export const settingsSchema = profileSchema.extend({
  name: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(2, "Name muss mindestens 2 Zeichen haben").max(100).optional()
  ),
});

export const workoutSchema = z.object({
  name: z.string().min(1).max(200),
  template: z.enum([
    "PUSH_PULL_LEGS",
    "UPPER_LOWER",
    "FULL_BODY",
    "BRO_SPLIT",
    "BEGINNER",
    "HYPERTROPHY",
    "FAT_LOSS",
    "STRENGTH",
    "CUSTOM",
  ]),
  description: z.string().max(1000).optional(),
});

export const sessionSetSchema = z.object({
  exerciseName: z.string().min(1),
  setNumber: z.coerce.number().int().positive(),
  reps: z.coerce.number().int().positive().optional(),
  weightKg: z.coerce.number().nonnegative().optional(),
  durationSec: z.coerce.number().int().positive().optional(),
});

export const quickAddFoodSchema = z
  .object({
    foodItemId: z.string().min(1).optional(),
    offCode: z
      .string()
      .optional()
      .transform((s) => {
        if (!s?.trim()) return undefined;
        const digits = s.replace(/\D/g, "");
        return digits.length >= 8 ? digits : undefined;
      }),
    quantityG: z.coerce.number().positive().max(5000),
    mealType: z.enum([
      "BREAKFAST",
      "LUNCH",
      "DINNER",
      "SNACK",
      "PRE_WORKOUT",
      "POST_WORKOUT",
    ]),
    date: z.string().optional(),
  })
  .refine((d) => d.foodItemId || d.offCode, {
    message: "foodItemId oder offCode erforderlich",
  });

export const nutritionGoalSchema = z.object({
  nutritionGoal: z.enum(["MUSCLE_GAIN", "FAT_LOSS", "MAINTENANCE", "LEAN_BULK", "RECOMP"]),
  waterTargetMl: z.coerce.number().int().min(500).max(10000).optional(),
});

export const waterLogSchema = z.object({
  amountMl: z.coerce.number().int().positive().max(2000),
  date: z.string().optional(),
});

export const recipeSchema = z.object({
  name: z.string().min(1).max(120),
  servings: z.coerce.number().int().min(1).max(50).default(1),
  description: z.string().max(500).optional(),
  isMealTemplate: z.boolean().optional(),
  ingredients: z
    .array(
      z.object({
        foodItemId: z.string(),
        quantityG: z.coerce.number().positive(),
      })
    )
    .min(1),
});

export const customFoodSchema = z.object({
  name: z.string().min(1).max(120),
  category: z
    .enum([
      "MEAT",
      "FISH",
      "DAIRY",
      "VEGETABLES",
      "FRUIT",
      "DRINKS",
      "SWEETS",
      "FAST_FOOD",
      "FITNESS",
      "GRAINS",
      "LEGUMES",
      "OILS",
      "OTHER",
    ])
    .optional(),
  calories: z.coerce.number().nonnegative(),
  proteinG: z.coerce.number().nonnegative(),
  carbsG: z.coerce.number().nonnegative(),
  fatG: z.coerce.number().nonnegative(),
  servingG: z.coerce.number().positive().default(100),
});

export const mealSchema = z.object({
  name: z.string().min(1),
  mealType: z.enum([
    "BREAKFAST",
    "LUNCH",
    "DINNER",
    "SNACK",
    "PRE_WORKOUT",
    "POST_WORKOUT",
  ]),
  date: z.string(),
  items: z.array(
    z.object({
      foodItemId: z.string(),
      quantityG: z.coerce.number().positive(),
    })
  ),
});

export const progressEntrySchema = z.object({
  date: z.string(),
  weightKg: z.coerce.number().positive().optional(),
  bodyFatPct: z.coerce.number().min(0).max(100).optional(),
  chestCm: z.coerce.number().positive().optional(),
  waistCm: z.coerce.number().positive().optional(),
  hipsCm: z.coerce.number().positive().optional(),
  bicepsCm: z.coerce.number().positive().optional(),
  thighsCm: z.coerce.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

export const goalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  targetValue: z.coerce.number().optional(),
  unit: z.string().max(50).optional(),
  deadline: z.string().optional(),
});

export const chatMessageSchema = z.object({
  chatId: z.string().optional(),
  message: z.string().min(1).max(4000),
  stream: z.boolean().optional(),
});

export const friendRequestSchema = z.object({
  email: z.string().email(),
});

export const supportRequestSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(254),
  category: z.enum(["PROBLEM", "IMPROVEMENT", "FEATURE", "BUG", "ACCOUNT", "OTHER"]),
  message: z.string().min(10).max(5000),
  /** Honeypot — must stay empty */
  website: z.string().max(100).optional(),
});
