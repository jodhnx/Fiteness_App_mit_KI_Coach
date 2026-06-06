import type { PrismaClient } from "@prisma/client";
import { EXERCISE_LIBRARY } from "../src/data/exercise-library";
import { disconnectSeedPrisma, getSeedPrisma } from "./seed-client";

export async function seedExercises(prismaClient?: PrismaClient) {
  const prisma = prismaClient ?? getSeedPrisma();
  console.log(`Seeding ${EXERCISE_LIBRARY.length} exercises...`);

  const batchSize = 100;
  for (let i = 0; i < EXERCISE_LIBRARY.length; i += batchSize) {
    const batch = EXERCISE_LIBRARY.slice(i, i + batchSize);
    await prisma.exerciseLibrary.createMany({
      data: batch.map((ex) => ({
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
      })),
      skipDuplicates: true,
    });
    if (i % 500 === 0 && i > 0) {
      console.log(`  ${Math.min(i + batchSize, EXERCISE_LIBRARY.length)} / ${EXERCISE_LIBRARY.length}`);
    }
  }

  const count = await prisma.exerciseLibrary.count();
  console.log(`Exercise library seeded — ${count} rows in DB.`);
}

const isDirectRun =
  typeof require !== "undefined" &&
  typeof require.main !== "undefined" &&
  require.main === module;

if (isDirectRun) {
  seedExercises()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => disconnectSeedPrisma());
}
