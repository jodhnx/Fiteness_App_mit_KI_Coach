export type WorkoutCategoryId =
  | "PUSH"
  | "PULL"
  | "LEGS"
  | "UPPER"
  | "LOWER"
  | "FULL"
  | "CUSTOM";

export type PlanFocusId =
  | "CHEST"
  | "BACK"
  | "LEGS"
  | "PUSH"
  | "PULL"
  | "UPPER"
  | "LOWER"
  | "FULL"
  | "ARMS"
  | "SHOULDERS";

export const PLAN_FOCUS_OPTIONS: { id: PlanFocusId; label: string }[] = [
  { id: "CHEST", label: "Brust" },
  { id: "BACK", label: "Rücken" },
  { id: "LEGS", label: "Beine" },
  { id: "PUSH", label: "Push" },
  { id: "PULL", label: "Pull" },
  { id: "UPPER", label: "Oberkörper" },
  { id: "LOWER", label: "Unterkörper" },
  { id: "FULL", label: "Ganzkörper" },
  { id: "ARMS", label: "Arme" },
  { id: "SHOULDERS", label: "Schultern" },
];

export const TRAINING_WEEKDAYS = [
  { id: 0, label: "Montag", short: "Mo" },
  { id: 1, label: "Dienstag", short: "Di" },
  { id: 2, label: "Mittwoch", short: "Mi" },
  { id: 3, label: "Donnerstag", short: "Do" },
  { id: 4, label: "Freitag", short: "Fr" },
  { id: 5, label: "Samstag", short: "Sa" },
  { id: 6, label: "Sonntag", short: "So" },
] as const;

export const WORKOUT_CATEGORIES: {
  id: WorkoutCategoryId;
  label: string;
  dayName: string;
  description: string;
}[] = [
  { id: "PUSH", label: "Push", dayName: "Push", description: "Brust, Schultern, Trizeps" },
  { id: "PULL", label: "Pull", dayName: "Pull", description: "Rücken, Bizeps" },
  { id: "LEGS", label: "Beine", dayName: "Beine", description: "Beine, Gesäß" },
  { id: "UPPER", label: "Oberkörper", dayName: "Oberkörper", description: "Oberkörper" },
  { id: "LOWER", label: "Unterkörper", dayName: "Unterkörper", description: "Unterkörper" },
  { id: "FULL", label: "Ganzkörper", dayName: "Ganzkörper", description: "Ganzkörper" },
  { id: "CUSTOM", label: "Eigenes Workout", dayName: "Workout", description: "" },
];

export function dayForCategory(category: WorkoutCategoryId) {
  const cat = WORKOUT_CATEGORIES.find((c) => c.id === category);
  return {
    name: cat?.dayName ?? "Workout",
    description: cat?.description ?? "",
  };
}
