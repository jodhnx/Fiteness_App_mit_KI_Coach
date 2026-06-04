import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { FOOD_CATALOG } from "../src/data/food-catalog";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function seedFoods() {
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

seedFoods()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
