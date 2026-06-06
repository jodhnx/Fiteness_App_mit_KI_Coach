import type { PrismaClient } from "@prisma/client";
import { EXERCISE_LIBRARY } from "@/data/exercise-library";

let seeding: Promise<void> | null = null;

export async function ensureExerciseLibrarySeeded(
  db: PrismaClient,
  minCount = 50
): Promise<number> {
  const count = await db.exerciseLibrary.count();
  if (count >= minCount) return count;

  if (!seeding) {
    seeding = (async () => {
      console.log(`[exercises] Auto-seeding ${EXERCISE_LIBRARY.length} exercises…`);
      const batchSize = 25;
      for (let i = 0; i < EXERCISE_LIBRARY.length; i += batchSize) {
        const batch = EXERCISE_LIBRARY.slice(i, i + batchSize);
        await Promise.all(
          batch.map((ex) =>
            db.exerciseLibrary.upsert({
              where: { slug: ex.slug },
              create: {
                slug: ex.slug,
                name: ex.name,
                muscleGroup: ex.muscleGroup,
                difficulty: ex.difficulty,
                description: ex.description,
                instructions: ex.instructions.join("\n"),
                imageUrl: ex.imageUrl,
                equipment: ex.equipment,
                primaryMuscles: ex.primaryMuscles,
                secondaryMuscles: ex.secondaryMuscles,
                isCompound: ex.isCompound,
              },
              update: {
                name: ex.name,
                muscleGroup: ex.muscleGroup,
                difficulty: ex.difficulty,
                description: ex.description,
                instructions: ex.instructions.join("\n"),
                imageUrl: ex.imageUrl,
                equipment: ex.equipment,
                primaryMuscles: ex.primaryMuscles,
                secondaryMuscles: ex.secondaryMuscles,
                isCompound: ex.isCompound,
              },
            })
          )
        );
      }
      console.log("[exercises] Auto-seed complete.");
    })().finally(() => {
      seeding = null;
    });
  }

  await seeding;
  return db.exerciseLibrary.count();
}
