import type { MealType } from "@prisma/client";

/** Primary tracking meals (UI) */
export const TRACK_MEAL_ORDER: MealType[] = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "SNACK",
];

export const MEAL_TYPE_ORDER: MealType[] = [
  ...TRACK_MEAL_ORDER,
  "PRE_WORKOUT",
  "POST_WORKOUT",
];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: "Frühstück",
  LUNCH: "Mittagessen",
  DINNER: "Abendessen",
  SNACK: "Snacks",
  PRE_WORKOUT: "Pre-Workout",
  POST_WORKOUT: "Post-Workout",
};

export const MEAL_TYPE_SHORT: Partial<Record<MealType, string>> = {
  BREAKFAST: "Früh",
  LUNCH: "Mit",
  DINNER: "Abend",
  SNACK: "Snack",
  PRE_WORKOUT: "Pre",
  POST_WORKOUT: "Post",
};

/** Typical meal slot for quick-add based on local time. */
export function mealTypeForHour(hour = new Date().getHours()): MealType {
  if (hour < 11) return "BREAKFAST";
  if (hour < 15) return "LUNCH";
  if (hour < 21) return "DINNER";
  return "SNACK";
}
