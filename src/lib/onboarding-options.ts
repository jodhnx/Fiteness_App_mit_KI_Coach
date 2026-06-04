import type {
  ActivityLevel,
  Gender,
  NutritionGoal,
  PlanLevel,
  TrainingGoal,
} from "@prisma/client";

export const ONBOARDING_GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Männlich" },
  { value: "FEMALE", label: "Weiblich" },
];

export const ONBOARDING_ACTIVITY_OPTIONS: {
  value: ActivityLevel;
  label: string;
  hint: string;
}[] = [
  { value: "SEDENTARY", label: "Kaum aktiv", hint: "Büro, wenig Bewegung" },
  { value: "LIGHT", label: "Leicht aktiv", hint: "1–2× Sport / Woche" },
  { value: "MODERATE", label: "Aktiv", hint: "3–4× Training / Woche" },
  { value: "ACTIVE", label: "Hoch aktiv", hint: "4–5× Kraft/Cardio, viel Bewegung" },
  { value: "VERY_ACTIVE", label: "Sehr aktiv", hint: "6–7× oder körperliche Arbeit" },
];

export const ONBOARDING_MAIN_GOAL_OPTIONS: {
  value: TrainingGoal;
  label: string;
  description: string;
}[] = [
  { value: "GAIN_MUSCLE", label: "Muskelaufbau", description: "Masse & Kraft" },
  { value: "LOSE_WEIGHT", label: "Fettabbau", description: "Defizit & Definition" },
  { value: "GENERAL_FITNESS", label: "Body Recomp", description: "Umbau bei stabilem Gewicht" },
  { value: "STRENGTH", label: "Kraftaufbau", description: "Maximalkraft & Technik" },
  { value: "ENDURANCE", label: "Ausdauer", description: "Laufen, Rad, Ausdauer" },
  { value: "GENERAL_FITNESS", label: "Allgemeine Fitness", description: "Gesund & fit bleiben" },
];

/** Distinct keys for UI (recomp uses dedicated nutrition goal) */
export type MainGoalKey =
  | "GAIN_MUSCLE"
  | "LOSE_WEIGHT"
  | "RECOMP"
  | "STRENGTH"
  | "ENDURANCE"
  | "GENERAL_FITNESS";

export const ONBOARDING_MAIN_GOAL_UI: {
  key: MainGoalKey;
  trainingGoal: TrainingGoal;
  label: string;
}[] = [
  { key: "GAIN_MUSCLE", trainingGoal: "GAIN_MUSCLE", label: "Muskelaufbau" },
  { key: "LOSE_WEIGHT", trainingGoal: "LOSE_WEIGHT", label: "Fettabbau" },
  { key: "RECOMP", trainingGoal: "GENERAL_FITNESS", label: "Recomp" },
  { key: "STRENGTH", trainingGoal: "STRENGTH", label: "Kraftaufbau" },
  { key: "ENDURANCE", trainingGoal: "ENDURANCE", label: "Ausdauer" },
  { key: "GENERAL_FITNESS", trainingGoal: "GENERAL_FITNESS", label: "Gesundheit" },
];

export function trainingGoalFromMainGoalKey(key: MainGoalKey): TrainingGoal {
  return ONBOARDING_MAIN_GOAL_UI.find((o) => o.key === key)?.trainingGoal ?? "GENERAL_FITNESS";
}

export function defaultNutritionGoalForMainGoal(key: MainGoalKey): NutritionGoal {
  switch (key) {
    case "LOSE_WEIGHT":
      return "FAT_LOSS";
    case "GAIN_MUSCLE":
      return "MUSCLE_GAIN";
    case "RECOMP":
      return "RECOMP";
    case "STRENGTH":
      return "LEAN_BULK";
    case "ENDURANCE":
      return "MAINTENANCE";
    default:
      return "MAINTENANCE";
  }
}

export const ONBOARDING_EXPERIENCE_OPTIONS: { value: PlanLevel; label: string }[] = [
  { value: "BEGINNER", label: "Anfänger" },
  { value: "INTERMEDIATE", label: "Fortgeschritten" },
  { value: "ADVANCED", label: "Advanced" },
];

export const ONBOARDING_TRAINING_DAYS = [2, 3, 4, 5, 6] as const;

export const ONBOARDING_NUTRITION_GOAL_OPTIONS: {
  value: NutritionGoal;
  label: string;
  description: string;
}[] = [
  { value: "FAT_LOSS", label: "Cut", description: "Kaloriendefizit" },
  { value: "LEAN_BULK", label: "Lean Bulk", description: "Langsam aufbauen" },
  { value: "MUSCLE_GAIN", label: "Aufbau", description: "Überschuss für Masse" },
  { value: "MAINTENANCE", label: "Erhaltung", description: "Gewicht halten" },
  { value: "RECOMP", label: "Recomp", description: "Umbau" },
];
