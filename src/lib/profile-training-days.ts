import type { PlanLevel, TrainingGoal } from "@prisma/client";

/** Empfohlene Trainingstage — ausgelagert gegen zirkuläre Imports mit calorie-target */
export function recommendedTrainingDays(
  workoutDaysPerWeek: number | null | undefined,
  trainingGoal: TrainingGoal
): number {
  if (workoutDaysPerWeek && workoutDaysPerWeek >= 2 && workoutDaysPerWeek <= 6) {
    return workoutDaysPerWeek;
  }
  switch (trainingGoal) {
    case "STRENGTH":
    case "GAIN_MUSCLE":
      return 4;
    case "ENDURANCE":
      return 5;
    case "LOSE_WEIGHT":
      return 4;
    default:
      return 3;
  }
}

export const EXPERIENCE_LABELS: Record<PlanLevel, string> = {
  BEGINNER: "Anfänger",
  INTERMEDIATE: "Fortgeschritten",
  ADVANCED: "Advanced",
  PRO: "Pro",
};
