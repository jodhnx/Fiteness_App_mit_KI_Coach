import type { EquipmentType, MuscleGroup } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Statische Alternativen nach Muskelgruppe und Bewegungsmuster */
const PATTERN_ALTERNATIVES: Record<string, string[]> = {
  "barbell-bench-press": [
    "dumbbell-bench-press",
    "incline-dumbbell-press",
    "chest-press-machine",
    "smith-machine-bench-press",
    "push-up",
  ],
  "barbell-back-squat": [
    "front-squat",
    "leg-press",
    "goblet-squat",
    "hack-squat",
    "bulgarian-split-squat",
  ],
  "barbell-deadlift": [
    "romanian-deadlift",
    "sumo-deadlift",
    "rack-pull",
    "hip-thrust",
  ],
  "pull-up": ["lat-pulldown", "chin-up", "inverted-row", "wide-grip-lat-pulldown"],
  "overhead-press": [
    "dumbbell-shoulder-press",
    "arnold-press",
    "machine-shoulder-press",
    "landmine-shoulder-press",
  ],
};

export async function getExerciseAlternatives(
  exerciseLibraryId: string,
  limit = 8
) {
  const exercise = await prisma.exerciseLibrary.findUnique({
    where: { id: exerciseLibraryId },
  });
  if (!exercise) return [];

  const slugAlts = PATTERN_ALTERNATIVES[exercise.slug] ?? [];
  const slugMatches = slugAlts.length
    ? await prisma.exerciseLibrary.findMany({
        where: { slug: { in: slugAlts } },
        take: limit,
      })
    : [];

  if (slugMatches.length >= limit) return slugMatches;

  const sameMuscle = await prisma.exerciseLibrary.findMany({
    where: {
      muscleGroup: exercise.muscleGroup,
      id: { not: exerciseLibraryId },
      slug: { notIn: slugMatches.map((e) => e.slug) },
    },
    orderBy: { usageCount: "desc" },
    take: limit - slugMatches.length,
  });

  return [...slugMatches, ...sameMuscle];
}

export function buildAlternativesPrompt(
  exerciseName: string,
  muscleGroup: MuscleGroup,
  equipment: EquipmentType,
  availableSlugs: string[]
) {
  return `Übung: ${exerciseName}
Muskelgruppe: ${muscleGroup}
Equipment: ${equipment}
Wähle aus dieser Slug-Liste die 5 besten Alternativen (nur Slugs, kommagetrennt): ${availableSlugs.slice(0, 80).join(", ")}`;
}
