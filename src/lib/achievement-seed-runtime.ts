import type { PrismaClient } from "@prisma/client";
import { getAllAchievementDefinitions } from "@/lib/achievement-catalog";
import { buildLevelTable } from "@/lib/level-system";

let seeding: Promise<number> | null = null;

async function runAchievementSeed(db: PrismaClient): Promise<number> {
  const levels = buildLevelTable();
  for (const l of levels) {
    await db.level.upsert({
      where: { id: l.id },
      create: l,
      update: l,
    });
  }

  const achievements = getAllAchievementDefinitions();
  const batchSize = 50;
  for (let i = 0; i < achievements.length; i += batchSize) {
    const batch = achievements.slice(i, i + batchSize);
    await Promise.all(
      batch.map((a) =>
        db.achievement.upsert({
          where: { slug: a.slug },
          create: {
            slug: a.slug,
            name: a.name,
            description: a.description,
            icon: a.icon,
            xpReward: a.xpReward,
            category: a.category,
            tier: a.tier,
            targetValue: a.targetValue,
            metricKey: a.metricKey,
            sortOrder: a.sortOrder,
          },
          update: {
            name: a.name,
            description: a.description,
            icon: a.icon,
            xpReward: a.xpReward,
            category: a.category,
            tier: a.tier,
            targetValue: a.targetValue,
            metricKey: a.metricKey,
            sortOrder: a.sortOrder,
          },
        })
      )
    );
  }

  const count = await db.achievement.count();
  console.log(`[achievements] Auto-seed complete — ${count} definitions.`);
  return count;
}

export async function ensureAchievementsSeeded(
  db: PrismaClient,
  minCount = 10
): Promise<number> {
  const count = await db.achievement.count();
  if (count >= minCount) return count;

  if (!seeding) {
    seeding = runAchievementSeed(db).finally(() => {
      seeding = null;
    });
  }

  return seeding;
}
