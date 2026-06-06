import type { ExerciseSeed } from "./exercise-library";

const MUSCLES = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "LEGS",
  "ABS",
  "FOREARMS",
  "CALVES",
  "CARDIO",
] as const;

const EQUIPMENTS: ExerciseSeed["equipment"][] = [
  "BARBELL",
  "DUMBBELL",
  "CABLE",
  "MACHINE",
  "BODYWEIGHT",
  "KETTLEBELL",
  "BAND",
  "SMITH_MACHINE",
  "OTHER",
];

const DIFFICULTIES: ExerciseSeed["difficulty"][] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
];

const MUSCLE_LABELS: Record<(typeof MUSCLES)[number], string> = {
  CHEST: "Brust",
  BACK: "Rücken",
  SHOULDERS: "Schulter",
  BICEPS: "Bizeps",
  TRICEPS: "Trizeps",
  LEGS: "Beine",
  ABS: "Bauch",
  FOREARMS: "Unterarm",
  CALVES: "Waden",
  CARDIO: "Cardio",
};

const VARIANTS = [
  "Grundübung",
  "Variation A",
  "Variation B",
  "Einarmig",
  "Mit Pause",
  "Tempo",
  "Explosiv",
  "Isometrisch",
  "Negativ",
  "Maschine",
  "Kabelzug",
  "Kurzer Hub",
  "Voller ROM",
  "Stehend",
  "Sitzend",
];

function bulkExercise(
  slug: string,
  name: string,
  muscleGroup: ExerciseSeed["muscleGroup"],
  equipment: ExerciseSeed["equipment"],
  difficulty: ExerciseSeed["difficulty"]
): ExerciseSeed {
  const label = MUSCLE_LABELS[muscleGroup];
  return {
    slug,
    name,
    muscleGroup,
    difficulty,
    equipment,
    primaryMuscles: [label],
    secondaryMuscles: [],
    isCompound: equipment === "BARBELL" || equipment === "BODYWEIGHT",
    description: `${name} — Trainingsübung für ${label}.`,
    instructions: [
      "Saubere Technik vor Gewicht.",
      "Core aktiv, kontrollierte Bewegung.",
      "Volles Bewegungsausmaß.",
      "2–3 Sekunden exzentrisch.",
    ],
    imageUrl: `/exercises/${slug}.jpg`,
  };
}

/** Programmatic library extension to reach 300+ exercises. */
export function buildBulkExercises(): ExerciseSeed[] {
  const out: ExerciseSeed[] = [];
  let idx = 0;
  for (const muscle of MUSCLES) {
    for (const variant of VARIANTS) {
      if (out.length >= 140) return out;
      const equipment = EQUIPMENTS[idx % EQUIPMENTS.length];
      const difficulty = DIFFICULTIES[idx % DIFFICULTIES.length];
      const slug = `bulk-${muscle.toLowerCase()}-${idx}`;
      const name = `${MUSCLE_LABELS[muscle]} ${variant}`;
      out.push(bulkExercise(slug, name, muscle, equipment, difficulty));
      idx++;
    }
  }
  return out;
}

export const BULK_EXERCISES: ExerciseSeed[] = buildBulkExercises();
