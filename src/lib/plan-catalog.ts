import type {
  PlanEfficiency,
  PlanEquipmentFilter,
  PlanGoal,
  PlanLevel,
  PlanTemplateType,
} from "@prisma/client";
import type { CatalogExerciseEntry } from "@/lib/plan-catalog-builders";
import {
  catalogDaysFromDefs,
  PREMIUM_ARNOLD_DAYS,
  PREMIUM_PPL_DAYS,
  PREMIUM_SCIENCE_PPL_DAYS,
  PREMIUM_UPPER_LOWER_DAYS,
} from "@/lib/plan-catalog-builders";

export type { CatalogExerciseEntry };

export type CatalogDay = {
  name: string;
  description?: string;
  exerciseSlugs: string[];
  entries?: CatalogExerciseEntry[];
  targetSets?: number;
  targetReps?: string;
  restSeconds?: number;
};

export type CatalogPlan = {
  catalogKey: string;
  template: Exclude<PlanTemplateType, "CUSTOM">;
  name: string;
  description: string;
  goal: PlanGoal;
  level: PlanLevel;
  efficiency: PlanEfficiency;
  daysPerWeek: number;
  durationMinutes: number;
  equipment: PlanEquipmentFilter[];
  scienceBased: boolean;
  days: CatalogDay[];
};

const gym: PlanEquipmentFilter[] = ["GYM"];

export const PLAN_CATALOG: CatalogPlan[] = [
  {
    catalogKey: "PUSH_PULL_LEGS",
    template: "PUSH_PULL_LEGS",
    name: "Push Pull Legs",
    description: "Klassischer 3er-Split für Hypertrophie und Kraft.",
    goal: "MUSCLE_GAIN",
    level: "INTERMEDIATE",
    efficiency: "MAX_EFFICIENCY",
    daysPerWeek: 3,
    durationMinutes: 60,
    equipment: gym,
    scienceBased: false,
    days: catalogDaysFromDefs(PREMIUM_PPL_DAYS),
  },
  {
    catalogKey: "UPPER_LOWER",
    template: "UPPER_LOWER",
    name: "Upper Lower",
    description: "4 Trainingstage — Oberkörper/Unterkörper im Wechsel, evidenzbasiertes Volumen.",
    goal: "MUSCLE_GAIN",
    level: "INTERMEDIATE",
    efficiency: "TIME_OPTIMIZED",
    daysPerWeek: 4,
    durationMinutes: 65,
    equipment: gym,
    scienceBased: false,
    days: catalogDaysFromDefs(PREMIUM_UPPER_LOWER_DAYS),
  },
  {
    catalogKey: "FULL_BODY",
    template: "FULL_BODY",
    name: "Ganzkörper",
    description: "Ganzkörpertraining 3× pro Woche.",
    goal: "GENERAL_FITNESS",
    level: "BEGINNER",
    efficiency: "TIME_OPTIMIZED",
    daysPerWeek: 3,
    durationMinutes: 45,
    equipment: gym,
    scienceBased: false,
    days: [
      {
        name: "Ganzkörper A",
        exerciseSlugs: [
          "barbell-back-squat",
          "barbell-bench-press",
          "bent-over-barbell-row",
          "overhead-press",
          "plank",
        ],
      },
      {
        name: "Ganzkörper B",
        exerciseSlugs: [
          "barbell-deadlift",
          "incline-dumbbell-press",
          "lat-pulldown",
          "walking-lunge",
          "barbell-curl",
        ],
      },
      {
        name: "Ganzkörper C",
        exerciseSlugs: [
          "leg-press",
          "pull-up",
          "lateral-raise",
          "romanian-deadlift",
          "tricep-pushdown",
        ],
      },
    ],
  },
  {
    catalogKey: "BRO_SPLIT",
    template: "BRO_SPLIT",
    name: "Bro Split",
    description: "Ein Muskel pro Tag – 5 Tage.",
    goal: "MUSCLE_GAIN",
    level: "ADVANCED",
    efficiency: "MAX_EFFICIENCY",
    daysPerWeek: 5,
    durationMinutes: 60,
    equipment: gym,
    scienceBased: false,
    days: [
      {
        name: "Brust",
        exerciseSlugs: ["barbell-bench-press", "incline-dumbbell-press", "dumbbell-fly", "push-up"],
      },
      {
        name: "Rücken",
        exerciseSlugs: ["barbell-deadlift", "pull-up", "bent-over-barbell-row", "lat-pulldown"],
      },
      {
        name: "Schultern",
        exerciseSlugs: ["overhead-press", "lateral-raise", "face-pull", "rear-delt-fly"],
      },
      {
        name: "Arme",
        exerciseSlugs: ["barbell-curl", "hammer-curl", "tricep-pushdown", "skull-crusher"],
      },
      {
        name: "Beine",
        exerciseSlugs: ["barbell-back-squat", "leg-press", "romanian-deadlift", "standing-calf-raise"],
      },
    ],
  },
  {
    catalogKey: "BEGINNER",
    template: "BEGINNER",
    name: "Anfängerplan",
    description: "Einfacher Einstieg mit Grundübungen.",
    goal: "GENERAL_FITNESS",
    level: "BEGINNER",
    efficiency: "TIME_OPTIMIZED",
    daysPerWeek: 3,
    durationMinutes: 45,
    equipment: gym,
    scienceBased: false,
    days: [
      {
        name: "Tag 1",
        exerciseSlugs: ["goblet-squat", "push-up", "lat-pulldown", "plank", "walking-lunge"],
        targetSets: 3,
        targetReps: "10-12",
      },
      {
        name: "Tag 2",
        exerciseSlugs: ["leg-press", "dumbbell-bench-press", "seated-cable-row", "lateral-raise"],
      },
      {
        name: "Tag 3",
        exerciseSlugs: ["romanian-deadlift", "chest-press-machine", "face-pull", "crunch"],
      },
    ],
  },
  {
    catalogKey: "HYPERTROPHY",
    template: "HYPERTROPHY",
    name: "Muskelaufbau",
    description: "Premium Hypertrophie-PPL: 10–20 Sätze/Muskel, progressive Überladung.",
    goal: "MUSCLE_GAIN",
    level: "INTERMEDIATE",
    efficiency: "MAX_EFFICIENCY",
    daysPerWeek: 3,
    durationMinutes: 75,
    equipment: gym,
    scienceBased: false,
    days: catalogDaysFromDefs(PREMIUM_PPL_DAYS),
  },
  {
    catalogKey: "FAT_LOSS",
    template: "FAT_LOSS",
    name: "Fettabbau",
    description: "Kraft + Cardio, höhere Frequenz.",
    goal: "FAT_LOSS",
    level: "INTERMEDIATE",
    efficiency: "TIME_OPTIMIZED",
    daysPerWeek: 3,
    durationMinutes: 45,
    equipment: gym,
    scienceBased: false,
    days: [
      {
        name: "Circuit Strength",
        exerciseSlugs: ["goblet-squat", "push-up", "battle-ropes", "burpee"],
        targetSets: 3,
        targetReps: "12-15",
        restSeconds: 60,
      },
      {
        name: "Cardio + Core",
        exerciseSlugs: [
          "treadmill-running",
          "rowing-machine",
          "assault-bike",
          "plank",
          "mountain-climber-abs",
        ],
      },
      {
        name: "Full Body Burn",
        exerciseSlugs: ["barbell-back-squat", "dumbbell-shoulder-press", "walking-lunge", "burpee"],
      },
    ],
  },
  {
    catalogKey: "STRENGTH",
    template: "STRENGTH",
    name: "Kraftaufbau",
    description: "Schwere Grundübungen, weniger Wiederholungen.",
    goal: "STRENGTH_GAIN",
    level: "ADVANCED",
    efficiency: "MAX_EFFICIENCY",
    daysPerWeek: 3,
    durationMinutes: 90,
    equipment: gym,
    scienceBased: false,
    days: [
      {
        name: "Squat Day",
        exerciseSlugs: ["barbell-back-squat", "front-squat", "leg-press", "standing-calf-raise"],
        targetSets: 5,
        targetReps: "3-5",
        restSeconds: 180,
      },
      {
        name: "Bench Day",
        exerciseSlugs: ["barbell-bench-press", "close-grip-bench-press", "overhead-press", "tricep-pushdown"],
      },
      {
        name: "Deadlift Day",
        exerciseSlugs: ["barbell-deadlift", "bent-over-barbell-row", "pull-up", "face-pull"],
      },
    ],
  },
  {
    catalogKey: "SCIENCE_PPL",
    template: "SCIENCE_PPL",
    name: "Science Based PPL",
    description:
      "PPL nach Evidenz: 10–20 Sätze/Muskel/Woche, RIR 1–3, progressive Überladung.",
    goal: "MUSCLE_GAIN",
    level: "INTERMEDIATE",
    efficiency: "SCIENCE_OPTIMIZED",
    daysPerWeek: 3,
    durationMinutes: 70,
    equipment: gym,
    scienceBased: true,
    days: catalogDaysFromDefs(PREMIUM_SCIENCE_PPL_DAYS),
  },
  {
    catalogKey: "SCIENCE_UPPER_LOWER",
    template: "SCIENCE_UPPER_LOWER",
    name: "Science Based Upper Lower",
    description: "4×/Woche, hohe Muskel-Frequenz, 10–20 Sätze/Muskel — Aufwärmen, Compounds, Isolation.",
    goal: "MUSCLE_GAIN",
    level: "INTERMEDIATE",
    efficiency: "SCIENCE_OPTIMIZED",
    daysPerWeek: 4,
    durationMinutes: 65,
    equipment: gym,
    scienceBased: true,
    days: catalogDaysFromDefs(PREMIUM_UPPER_LOWER_DAYS),
  },
  {
    catalogKey: "SCIENCE_FULL_BODY",
    template: "SCIENCE_FULL_BODY",
    name: "Science Based Full Body",
    description: "3× Ganzkörper, jede Muskelgruppe 2–3×/Woche.",
    goal: "GENERAL_FITNESS",
    level: "BEGINNER",
    efficiency: "SCIENCE_OPTIMIZED",
    daysPerWeek: 3,
    durationMinutes: 45,
    equipment: gym,
    scienceBased: true,
    days: [
      {
        name: "Full A",
        exerciseSlugs: [
          "barbell-back-squat",
          "barbell-bench-press",
          "bent-over-barbell-row",
          "overhead-press",
          "plank",
        ],
        targetSets: 3,
        targetReps: "8-10",
      },
      {
        name: "Full B",
        exerciseSlugs: [
          "romanian-deadlift",
          "incline-dumbbell-press",
          "lat-pulldown",
          "walking-lunge",
          "face-pull",
        ],
      },
      {
        name: "Full C",
        exerciseSlugs: [
          "leg-press",
          "pull-up",
          "dumbbell-shoulder-press",
          "leg-curl-lying",
          "cable-crunch",
        ],
      },
    ],
  },
  {
    catalogKey: "HYPERTROPHY_FOCUS",
    template: "HYPERTROPHY_FOCUS",
    name: "Hypertrophy Focus",
    description: "Maximales Hypertrophie-Volumen mit Pump- und Isolationsarbeit.",
    goal: "MUSCLE_GAIN",
    level: "ADVANCED",
    efficiency: "SCIENCE_OPTIMIZED",
    daysPerWeek: 4,
    durationMinutes: 75,
    equipment: gym,
    scienceBased: true,
    days: [
      {
        name: "Chest & Triceps",
        exerciseSlugs: [
          "incline-dumbbell-press",
          "dumbbell-fly",
          "cable-crossover",
          "rope-tricep-pushdown",
          "skull-crusher",
        ],
        targetSets: 4,
        targetReps: "8-15",
      },
      {
        name: "Back & Biceps",
        exerciseSlugs: [
          "lat-pulldown",
          "seated-cable-row",
          "straight-arm-pulldown",
          "barbell-curl",
          "incline-dumbbell-curl",
        ],
      },
      {
        name: "Legs",
        exerciseSlugs: [
          "leg-press",
          "romanian-deadlift",
          "leg-extension",
          "leg-curl-seated",
          "seated-calf-raise",
        ],
      },
      {
        name: "Shoulders & Arms",
        exerciseSlugs: [
          "dumbbell-shoulder-press",
          "lateral-raise",
          "rear-delt-fly",
          "hammer-curl",
          "overhead-tricep-extension",
        ],
      },
    ],
  },
  {
    catalogKey: "STRENGTH_FOCUS",
    template: "STRENGTH_FOCUS",
    name: "Strength Focus",
    description: "Periodisiertes Krafttraining: Squat, Bench, Deadlift.",
    goal: "STRENGTH_GAIN",
    level: "PRO",
    efficiency: "SCIENCE_OPTIMIZED",
    daysPerWeek: 4,
    durationMinutes: 90,
    equipment: gym,
    scienceBased: true,
    days: [
      {
        name: "Squat",
        exerciseSlugs: ["barbell-back-squat", "front-squat", "leg-press", "standing-calf-raise"],
        targetSets: 5,
        targetReps: "3-5",
        restSeconds: 180,
      },
      {
        name: "Bench",
        exerciseSlugs: ["barbell-bench-press", "close-grip-bench-press", "overhead-press"],
      },
      {
        name: "Deadlift",
        exerciseSlugs: ["barbell-deadlift", "romanian-deadlift", "bent-over-barbell-row"],
      },
      {
        name: "Accessories",
        exerciseSlugs: ["pull-up", "face-pull", "walking-lunge", "plank"],
        targetSets: 3,
        targetReps: "8-12",
      },
    ],
  },
  {
    catalogKey: "CUTTING_FOCUS",
    template: "CUTTING_FOCUS",
    name: "Cutting Focus",
    description: "Krafterhalt bei moderatem Volumen + Conditioning.",
    goal: "FAT_LOSS",
    level: "INTERMEDIATE",
    efficiency: "SCIENCE_OPTIMIZED",
    daysPerWeek: 4,
    durationMinutes: 45,
    equipment: gym,
    scienceBased: true,
    days: [
      {
        name: "Upper Power",
        exerciseSlugs: ["barbell-bench-press", "bent-over-barbell-row", "overhead-press"],
        targetSets: 3,
        targetReps: "5-8",
      },
      {
        name: "Lower Power",
        exerciseSlugs: ["barbell-back-squat", "romanian-deadlift", "leg-curl-lying"],
      },
      {
        name: "Upper Volume",
        exerciseSlugs: ["incline-dumbbell-press", "lat-pulldown", "lateral-raise", "tricep-pushdown"],
        targetSets: 3,
        targetReps: "10-15",
        restSeconds: 60,
      },
      {
        name: "Conditioning",
        exerciseSlugs: ["assault-bike", "burpee", "plank", "mountain-climber-cardio"],
      },
    ],
  },
  {
    catalogKey: "HOME_DUMBBELL",
    template: "BEGINNER",
    name: "Home Gym Kurzhanteln",
    description: "Ganzkörper mit Kurzhanteln – 3× pro Woche.",
    goal: "GENERAL_FITNESS",
    level: "BEGINNER",
    efficiency: "TIME_OPTIMIZED",
    daysPerWeek: 3,
    durationMinutes: 30,
    equipment: ["DUMBBELLS_ONLY", "HOME_GYM"],
    scienceBased: false,
    days: [
      {
        name: "Tag A",
        exerciseSlugs: [
          "goblet-squat",
          "dumbbell-bench-press",
          "single-arm-dumbbell-row",
          "dumbbell-shoulder-press",
          "plank",
        ],
      },
      {
        name: "Tag B",
        exerciseSlugs: [
          "romanian-deadlift",
          "incline-dumbbell-press",
          "hammer-curl",
          "overhead-tricep-extension",
        ],
      },
      { name: "Tag C", exerciseSlugs: ["walking-lunge", "push-up", "lateral-raise", "crunch"] },
    ],
  },
  {
    catalogKey: "CALISTHENICS",
    template: "FULL_BODY",
    name: "Calisthenics",
    description: "Körpergewichts-Training ohne Equipment.",
    goal: "GENERAL_FITNESS",
    level: "INTERMEDIATE",
    efficiency: "TIME_OPTIMIZED",
    daysPerWeek: 3,
    durationMinutes: 30,
    equipment: ["CALISTHENICS"],
    scienceBased: false,
    days: [
      {
        name: "Push",
        exerciseSlugs: ["push-up", "decline-push-up", "dips-chest", "diamond-push-up", "plank"],
      },
      { name: "Pull", exerciseSlugs: ["pull-up", "inverted-row", "chin-up", "dead-hang"] },
      {
        name: "Legs & Core",
        exerciseSlugs: ["walking-lunge", "bulgarian-split-squat", "hanging-leg-raise", "plank"],
      },
    ],
  },
  {
    catalogKey: "ARNOLD_SPLIT",
    template: "BRO_SPLIT",
    name: "Arnold Split",
    description: "Arnold-Klassiker: Brust/Rücken, Schultern/Arme, Beine — Premium-Volumen.",
    goal: "MUSCLE_GAIN",
    level: "ADVANCED",
    efficiency: "MAX_EFFICIENCY",
    daysPerWeek: 3,
    durationMinutes: 75,
    equipment: gym,
    scienceBased: false,
    days: catalogDaysFromDefs(PREMIUM_ARNOLD_DAYS),
  },
  {
    catalogKey: "POWERLIFTING",
    template: "STRENGTH",
    name: "Powerlifting Grundlagen",
    description: "Kniebeuge, Bankdrücken, Kreuzheben — Kraftfokus mit Assistenzübungen.",
    goal: "STRENGTH_GAIN",
    level: "INTERMEDIATE",
    efficiency: "SCIENCE_OPTIMIZED",
    daysPerWeek: 4,
    durationMinutes: 75,
    equipment: gym,
    scienceBased: true,
    days: [
      {
        name: "Kniebeuge",
        exerciseSlugs: ["barbell-back-squat", "front-squat", "leg-press", "leg-curl", "plank"],
        targetSets: 5,
        targetReps: "3-6",
        restSeconds: 180,
      },
      {
        name: "Bankdrücken",
        exerciseSlugs: ["barbell-bench-press", "dips-triceps", "incline-dumbbell-press", "tricep-pushdown"],
        targetSets: 5,
        targetReps: "3-6",
        restSeconds: 180,
      },
      {
        name: "Kreuzheben",
        exerciseSlugs: ["barbell-deadlift", "romanian-deadlift", "bent-over-barbell-row", "pull-up"],
        targetSets: 5,
        targetReps: "3-6",
        restSeconds: 180,
      },
      {
        name: "Assistenz",
        exerciseSlugs: ["overhead-press", "lat-pulldown", "face-pull", "barbell-curl"],
        targetSets: 3,
        targetReps: "8-10",
        restSeconds: 90,
      },
    ],
  },
  {
    catalogKey: "ATHLETIC_PERFORMANCE",
    template: "FULL_BODY",
    name: "Athletik & Performance",
    description: "Kraft, Sprungkraft und Ausdauer — für sportliche Leistung.",
    goal: "RECOMP",
    level: "INTERMEDIATE",
    efficiency: "SCIENCE_OPTIMIZED",
    daysPerWeek: 4,
    durationMinutes: 60,
    equipment: gym,
    scienceBased: true,
    days: [
      {
        name: "Kraft A",
        exerciseSlugs: ["barbell-back-squat", "barbell-bench-press", "bent-over-barbell-row", "plank"],
        targetSets: 4,
        targetReps: "5-8",
        restSeconds: 120,
      },
      {
        name: "Explosiv",
        exerciseSlugs: ["burpee", "push-press", "pull-up", "farmer-walk", "walking-lunge"],
        targetSets: 3,
        targetReps: "5-8",
        restSeconds: 90,
      },
      {
        name: "Kraft B",
        exerciseSlugs: ["barbell-deadlift", "overhead-press", "lat-pulldown", "walking-lunge"],
        targetSets: 4,
        targetReps: "5-8",
        restSeconds: 120,
      },
      {
        name: "Conditioning",
        exerciseSlugs: ["assault-bike", "burpee", "mountain-climber-cardio", "plank", "farmer-walk"],
        targetSets: 3,
        targetReps: "30-45s",
        restSeconds: 60,
      },
    ],
  },
  {
    catalogKey: "BEGINNER_GYM",
    template: "BEGINNER",
    name: "Anfänger Gym Programm",
    description: "Einstieg ins Gym — Grundübungen, 3× pro Woche, linearer Progression.",
    goal: "GENERAL_FITNESS",
    level: "BEGINNER",
    efficiency: "TIME_OPTIMIZED",
    daysPerWeek: 3,
    durationMinutes: 45,
    equipment: gym,
    scienceBased: true,
    days: [
      {
        name: "Workout A",
        exerciseSlugs: ["goblet-squat", "dumbbell-bench-press", "lat-pulldown", "dumbbell-shoulder-press", "plank"],
        targetSets: 3,
        targetReps: "10-12",
        restSeconds: 90,
      },
      {
        name: "Workout B",
        exerciseSlugs: ["leg-press", "seated-cable-row", "incline-dumbbell-press", "leg-curl", "crunch"],
        targetSets: 3,
        targetReps: "10-12",
        restSeconds: 90,
      },
      {
        name: "Workout C",
        exerciseSlugs: ["romanian-deadlift", "dumbbell-bench-press", "single-arm-dumbbell-row", "lateral-raise", "plank"],
        targetSets: 3,
        targetReps: "10-12",
        restSeconds: 90,
      },
    ],
  },
  {
    catalogKey: "HOME_BEGINNER",
    template: "BEGINNER",
    name: "Home Workout Anfänger",
    description: "Körpergewicht & Kurzhanteln — ohne Gym, 3× pro Woche.",
    goal: "GENERAL_FITNESS",
    level: "BEGINNER",
    efficiency: "TIME_OPTIMIZED",
    daysPerWeek: 3,
    durationMinutes: 35,
    equipment: ["DUMBBELLS_ONLY", "HOME_GYM", "CALISTHENICS"],
    scienceBased: false,
    days: [
      {
        name: "Ganzkörper A",
        exerciseSlugs: ["goblet-squat", "push-up", "single-arm-dumbbell-row", "walking-lunge", "plank"],
        targetSets: 3,
        targetReps: "10-15",
        restSeconds: 60,
      },
      {
        name: "Ganzkörper B",
        exerciseSlugs: ["romanian-deadlift", "dumbbell-bench-press", "inverted-row", "glute-bridge", "crunch"],
        targetSets: 3,
        targetReps: "10-15",
        restSeconds: 60,
      },
      {
        name: "Ganzkörper C",
        exerciseSlugs: ["bulgarian-split-squat", "dumbbell-shoulder-press", "hammer-curl", "bench-dip", "plank"],
        targetSets: 3,
        targetReps: "10-15",
        restSeconds: 60,
      },
    ],
  },
  {
    catalogKey: "GERMAN_VOLUME",
    template: "HYPERTROPHY",
    name: "German Volume Training",
    description: "10×10 Methode — maximales Hypertrophie-Volumen für Fortgeschrittene.",
    goal: "MUSCLE_GAIN",
    level: "ADVANCED",
    efficiency: "MAX_EFFICIENCY",
    daysPerWeek: 3,
    durationMinutes: 75,
    equipment: gym,
    scienceBased: true,
    days: [
      {
        name: "Brust & Rücken",
        exerciseSlugs: ["incline-dumbbell-press", "bent-over-barbell-row", "cable-fly", "lat-pulldown"],
        targetSets: 10,
        targetReps: "10",
        restSeconds: 90,
      },
      {
        name: "Beine",
        exerciseSlugs: ["barbell-back-squat", "leg-press", "leg-extension", "leg-curl", "standing-calf-raise"],
        targetSets: 10,
        targetReps: "10",
        restSeconds: 90,
      },
      {
        name: "Schultern & Arme",
        exerciseSlugs: ["overhead-press", "lateral-raise", "barbell-curl", "tricep-pushdown"],
        targetSets: 10,
        targetReps: "10",
        restSeconds: 75,
      },
    ],
  },
];

export function getCatalogPlan(catalogKey: string): CatalogPlan | undefined {
  return PLAN_CATALOG.find((p) => p.catalogKey === catalogKey);
}

export type CatalogFilters = {
  goal?: PlanGoal;
  level?: PlanLevel;
  efficiency?: PlanEfficiency;
  daysPerWeek?: number;
  durationMinutes?: number;
  equipment?: PlanEquipmentFilter;
  scienceOnly?: boolean;
};

export function filterCatalogPlans(filters: CatalogFilters): CatalogPlan[] {
  return PLAN_CATALOG.filter((plan) => {
    if (filters.goal && plan.goal !== filters.goal) return false;
    if (filters.level && plan.level !== filters.level) return false;
    if (filters.efficiency && plan.efficiency !== filters.efficiency) return false;
    if (filters.daysPerWeek && plan.daysPerWeek !== filters.daysPerWeek) return false;
    if (filters.durationMinutes && plan.durationMinutes !== filters.durationMinutes) return false;
    if (filters.equipment && !plan.equipment.includes(filters.equipment)) return false;
    if (filters.scienceOnly && !plan.scienceBased) return false;
    return true;
  });
}

export const GOAL_LABELS: Record<PlanGoal, string> = {
  MUSCLE_GAIN: "Muskelaufbau",
  STRENGTH_GAIN: "Kraftaufbau",
  FAT_LOSS: "Fettabbau",
  RECOMP: "Body Recomposition",
  GENERAL_FITNESS: "Allgemeine Fitness",
};

export const LEVEL_LABELS: Record<PlanLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  PRO: "Pro",
};

export const EFFICIENCY_LABELS: Record<PlanEfficiency, string> = {
  MAX_EFFICIENCY: "Maximale Effizienz",
  TIME_OPTIMIZED: "Zeitoptimiert",
  SCIENCE_OPTIMIZED: "Wissenschaftlich optimiert",
};

export const EQUIPMENT_LABELS: Record<PlanEquipmentFilter, string> = {
  GYM: "Gym",
  HOME_GYM: "Home Gym",
  DUMBBELLS_ONLY: "Nur Kurzhanteln",
  CALISTHENICS: "Calisthenics",
};
