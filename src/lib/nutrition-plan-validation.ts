import { z } from "zod";
import { PLAN_DURATIONS } from "@/lib/nutrition-plan-constants";

const mealTypeEnum = z.enum([
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "SNACK",
  "PRE_WORKOUT",
  "POST_WORKOUT",
]);

export const createNutritionPlanSchema = z.object({
  name: z.string().trim().min(2).max(80),
  durationDays: z.coerce
    .number()
    .int()
    .refine((n) => (PLAN_DURATIONS as readonly number[]).includes(n), {
      message: "Ungültige Dauer",
    }),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  description: z.string().trim().max(500).optional().nullable(),
});

export const patchNutritionPlanSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED", "COMPLETED"]).optional(),
  isActive: z.boolean().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  action: z.enum(["duplicate", "archive", "activate"]).optional(),
});

export const addPlanMealSchema = z.object({
  dayId: z.string().min(1),
  mealType: mealTypeEnum,
  title: z.string().trim().max(80).optional().nullable(),
});

export const addPlanItemSchema = z.object({
  mealId: z.string().min(1),
  foodItemId: z.string().optional().nullable(),
  recipeId: z.string().optional().nullable(),
  /** Add entire saved meal template ingredients */
  savedMealId: z.string().optional().nullable(),
  nameSnapshot: z.string().trim().min(1).max(200).optional(),
  brandSnapshot: z.string().trim().max(120).optional().nullable(),
  quantityG: z.coerce.number().positive().max(5000).optional(),
  unit: z.string().trim().max(20).optional(),
  calories: z.coerce.number().min(0).max(20000).optional(),
  proteinG: z.coerce.number().min(0).max(2000).optional(),
  carbsG: z.coerce.number().min(0).max(2000).optional(),
  fatG: z.coerce.number().min(0).max(2000).optional(),
  fiberG: z.coerce.number().min(0).max(500).optional().nullable(),
  confirmed: z
    .object({
      name: z.string().optional(),
      brand: z.string().nullable().optional(),
      calories: z.number(),
      proteinG: z.number(),
      carbsG: z.number(),
      fatG: z.number(),
    })
    .optional(),
});

export const patchPlanItemSchema = z.object({
  quantityG: z.coerce.number().positive().max(5000).optional(),
  nameSnapshot: z.string().trim().min(1).max(200).optional(),
});

export const duplicatePlanDaySchema = z.object({
  sourceDayId: z.string().min(1),
  targetDayId: z.string().min(1),
});

export const logPlanItemSchema = z.object({
  mealType: mealTypeEnum.optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});
