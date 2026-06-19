export type WorkoutCategoryId =
  | "PUSH"
  | "PULL"
  | "LEGS"
  | "UPPER"
  | "LOWER"
  | "FULL"
  | "CUSTOM";

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
