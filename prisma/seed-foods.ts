import type { PrismaClient } from "@prisma/client";
import { FOOD_CATALOG } from "../src/data/food-catalog";
import { disconnectSeedPrisma, getSeedPrisma } from "./seed-client";

export async function seedFoods(prismaClient?: PrismaClient) {
  const prisma = prismaClient ?? getSeedPrisma();
  console.log(`Seeding ${FOOD_CATALOG.length} foods...`);
  const batchSize = 500;
  let inserted = 0;
  for (let i = 0; i < FOOD_CATALOG.length; i += batchSize) {
    const batch = FOOD_CATALOG.slice(i, i + batchSize);
    const result = await prisma.foodItem.createMany({
      data: batch.map((f) => ({
        slug: f.slug,
        name: f.name,
        brand: f.brand ?? null,
        category: f.category,
        calories: f.calories,
        proteinG: f.proteinG,
        carbsG: f.carbsG,
        fatG: f.fatG,
        servingG: f.servingG,
        barcode: f.barcode ?? null,
      })),
      skipDuplicates: true,
    });
    inserted += result.count;
    if ((i / batchSize) % 10 === 0) {
      console.log(`  ${Math.min(i + batchSize, FOOD_CATALOG.length)} / ${FOOD_CATALOG.length}`);
    }
  }
  console.log(`Food catalog: ${inserted} new rows (duplicates skipped).`);
}

const isDirectRun =
  typeof require !== "undefined" &&
  typeof require.main !== "undefined" &&
  require.main === module;

if (isDirectRun) {
  seedFoods()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => disconnectSeedPrisma());
}
