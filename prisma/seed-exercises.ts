import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { EXERCISE_LIBRARY } from "../src/data/exercise-library";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function seedExercises() {
  console.log(`Seeding ${EXERCISE_LIBRARY.length} exercises...`);
  const batchSize = 25;
  for (let i = 0; i < EXERCISE_LIBRARY.length; i += batchSize) {
    const batch = EXERCISE_LIBRARY.slice(i, i + batchSize);
    await Promise.all(
      batch.map((ex) =>
        prisma.exerciseLibrary.upsert({
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
  console.log("Exercise library seeded.");
}

seedExercises()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

export { seedExercises };
