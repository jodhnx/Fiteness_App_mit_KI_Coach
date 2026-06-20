import type { MuscleGroup, PlanEquipmentFilter, PlanGoal, PlanLevel } from "@prisma/client";
import type { RecommendationInput } from "@/lib/plan-science-engine";

export type ConfigGoal =
  | "MUSCLE_GAIN"
  | "FAT_LOSS"
  | "STRENGTH_GAIN"
  | "GENERAL_FITNESS"
  | "ENDURANCE";

export type ConfigLocation = "GYM" | "HOME" | "BOTH";
export type ConfigExperience = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type ConfigDuration = 30 | 45 | 60 | 90;
export type ConfigStyle = "MACHINES" | "FREEWEIGHT" | "MIXED" | "CALISTHENICS";
export type ConfigFocus =
  | "UPPER"
  | "LEGS"
  | "FULL_BODY"
  | "ARMS"
  | "CHEST"
  | "BACK"
  | "SHOULDERS";

export type ConfigEquipment =
  | "FULL_GYM"
  | "HOME_GYM"
  | "DUMBBELLS"
  | "BODYWEIGHT";

export type PlanConfiguratorInput = {
  goal: ConfigGoal;
  location: ConfigLocation;
  experience: ConfigExperience;
  durationMinutes: ConfigDuration;
  daysPerWeek: number;
  style: ConfigStyle;
  focus: ConfigFocus;
  equipment: ConfigEquipment;
};

const FOCUS_MUSCLES: Record<ConfigFocus, MuscleGroup[] | undefined> = {
  UPPER: ["CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS"],
  LEGS: ["LEGS", "CALVES"],
  FULL_BODY: undefined,
  ARMS: ["BICEPS", "TRICEPS", "FOREARMS"],
  CHEST: ["CHEST"],
  BACK: ["BACK"],
  SHOULDERS: ["SHOULDERS"],
};

export function mapConfiguratorToRecommendInput(
  input: PlanConfiguratorInput
): RecommendationInput {
  const goal: PlanGoal =
    input.goal === "ENDURANCE"
      ? "GENERAL_FITNESS"
      : input.goal === "FAT_LOSS"
        ? "FAT_LOSS"
        : input.goal;

  const level: PlanLevel =
    input.experience === "ADVANCED" ? "ADVANCED" : input.experience;

  let equipment: PlanEquipmentFilter = "GYM";
  if (input.style === "CALISTHENICS" || input.equipment === "BODYWEIGHT") {
    equipment = "CALISTHENICS";
  } else if (input.equipment === "DUMBBELLS") {
    equipment = "DUMBBELLS_ONLY";
  } else if (input.location === "HOME" || input.equipment === "HOME_GYM") {
    equipment = "HOME_GYM";
  } else if (input.location === "BOTH") {
    equipment = input.equipment === "FULL_GYM" ? "GYM" : "HOME_GYM";
  }

  return {
    goal,
    level,
    daysPerWeek: input.daysPerWeek,
    durationMinutes: input.durationMinutes,
    equipment,
    priorityMuscles: FOCUS_MUSCLES[input.focus],
    efficiency: input.style === "MACHINES" ? "TIME_OPTIMIZED" : "SCIENCE_OPTIMIZED",
  };
}

export const CONFIG_GOALS: { id: ConfigGoal; label: string; desc: string }[] = [
  { id: "MUSCLE_GAIN", label: "Muskelaufbau", desc: "Hypertrophie & Masse" },
  { id: "FAT_LOSS", label: "Fettverlust", desc: "Defizit & Definition" },
  { id: "STRENGTH_GAIN", label: "Kraftaufbau", desc: "Maximalkraft" },
  { id: "GENERAL_FITNESS", label: "Fitness", desc: "Gesund & aktiv bleiben" },
  { id: "ENDURANCE", label: "Ausdauer", desc: "Kondition & Ausdauer" },
];

export const CONFIG_LOCATIONS: { id: ConfigLocation; label: string }[] = [
  { id: "GYM", label: "Gym" },
  { id: "HOME", label: "Zuhause" },
  { id: "BOTH", label: "Beides" },
];

export const CONFIG_EXPERIENCE: { id: ConfigExperience; label: string }[] = [
  { id: "BEGINNER", label: "Anfänger" },
  { id: "INTERMEDIATE", label: "Fortgeschritten" },
  { id: "ADVANCED", label: "Profi" },
];

export const CONFIG_DURATIONS: ConfigDuration[] = [30, 45, 60, 90];
export const CONFIG_DAYS = [2, 3, 4, 5, 6, 7] as const;

export const CONFIG_STYLES: { id: ConfigStyle; label: string }[] = [
  { id: "MACHINES", label: "Maschinen" },
  { id: "FREEWEIGHT", label: "Freihantel" },
  { id: "MIXED", label: "Gemischt" },
  { id: "CALISTHENICS", label: "Calisthenics" },
];

export const CONFIG_FOCUS: { id: ConfigFocus; label: string }[] = [
  { id: "FULL_BODY", label: "Ganzkörper" },
  { id: "UPPER", label: "Oberkörper" },
  { id: "LEGS", label: "Beine" },
  { id: "CHEST", label: "Brust" },
  { id: "BACK", label: "Rücken" },
  { id: "SHOULDERS", label: "Schultern" },
  { id: "ARMS", label: "Arme" },
];

export const CONFIG_EQUIPMENT: { id: ConfigEquipment; label: string }[] = [
  { id: "FULL_GYM", label: "Voll ausgestattetes Gym" },
  { id: "HOME_GYM", label: "Home Gym" },
  { id: "DUMBBELLS", label: "Nur Kurzhanteln" },
  { id: "BODYWEIGHT", label: "Nur Körpergewicht" },
];
