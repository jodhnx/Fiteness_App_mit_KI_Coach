import type { PrismaClient } from "@prisma/client";
import { EXERCISE_LIBRARY } from "@/data/exercise-library";

let seeding: Promise<number> | null = null;

function toRow(ex: (typeof EXERCISE_LIBRARY)[number]) {
  return {
    slug: ex.slug,
    name: ex.name,
    muscleGroup: ex.muscleGroup,
    difficulty: ex.difficulty,
    description: ex.description,
    instructions: ex.instructions.join("\n"),
    imageUrl: ex.imageUrl ?? null,
    equipment: ex.equipment,
    primaryMuscles: ex.primaryMuscles,
    secondaryMuscles: ex.secondaryMuscles,
    isCompound: ex.isCompound,
  };
}

async function runFastSeed(db: PrismaClient): Promise<number> {
  console.log(`[exercises] Fast-seeding ${EXERCISE_LIBRARY.length} exercises…`);
  const batchSize = 100;
  for (let i = 0; i < EXERCISE_LIBRARY.length; i += batchSize) {
    const batch = EXERCISE_LIBRARY.slice(i, i + batchSize);
    await db.exerciseLibrary.createMany({
      data: batch.map(toRow),
      skipDuplicates: true,
    });
  }
  const count = await db.exerciseLibrary.count();
  console.log(`[exercises] Seed complete — ${count} in DB.`);
  return count;
}

export async function ensureExerciseLibrarySeeded(
  db: PrismaClient,
  minCount = 50
): Promise<number> {
  const count = await db.exerciseLibrary.count();
  if (count >= minCount) return count;

  if (!seeding) {
    seeding = runFastSeed(db).finally(() => {
      seeding = null;
    });
  }

  return seeding;
}
