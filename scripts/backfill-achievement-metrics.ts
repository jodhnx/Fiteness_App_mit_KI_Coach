/**
 * Backfill metricKey / targetValue / tier for existing Achievement rows (no deletes).
 * Run after migration: npx tsx scripts/backfill-achievement-metrics.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  metricKeyFromSlug,
  targetValueFromSlug,
} from "../src/lib/achievement-metric-backfill";
import { getAllAchievementDefinitions } from "../src/lib/achievement-catalog";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const rows = await prisma.achievement.findMany({
    select: {
      id: true,
      slug: true,
      category: true,
      metricKey: true,
      targetValue: true,
      tier: true,
    },
  });

  const catalogBySlug = new Map(
    getAllAchievementDefinitions().map((a) => [a.slug, a])
  );

  let updated = 0;
  for (const row of rows) {
    const fromCatalog = catalogBySlug.get(row.slug);
    const metricKey =
      row.metricKey ??
      fromCatalog?.metricKey ??
      metricKeyFromSlug(row.slug, row.category);
    const targetValue =
      row.targetValue > 0
        ? row.targetValue
        : (fromCatalog?.targetValue ??
          targetValueFromSlug(row.slug) ??
          1);
    const tier = row.tier || fromCatalog?.tier || "bronze";

    if (
      row.metricKey === metricKey &&
      row.targetValue === targetValue &&
      row.tier === tier
    ) {
      continue;
    }

    await prisma.achievement.update({
      where: { id: row.id },
      data: { metricKey, targetValue, tier },
    });
    updated++;
  }

  const missing = await prisma.achievement.count({
    where: { metricKey: null },
  });

  console.log(`Achievements scanned: ${rows.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Still missing metricKey: ${missing}`);

  if (missing > 0) {
    console.warn("Run npm run db:seed to merge catalog definitions.");
    process.exit(1);
  }

  console.log("Backfill OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
