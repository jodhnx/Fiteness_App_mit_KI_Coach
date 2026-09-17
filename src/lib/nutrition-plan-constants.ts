import type { MealType } from "@prisma/client";

export const PLAN_DURATIONS = [1, 3, 5, 7, 14, 28] as const;
export type PlanDuration = (typeof PLAN_DURATIONS)[number];

export const PLAN_MEAL_TYPES: MealType[] = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "PRE_WORKOUT",
  "POST_WORKOUT",
  "SNACK",
];

export const PLAN_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Entwurf",
  ACTIVE: "Aktiv",
  ARCHIVED: "Archiviert",
  COMPLETED: "Abgeschlossen",
};
