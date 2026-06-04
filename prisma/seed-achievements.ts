import type { PrismaClient } from "@prisma/client";
import { getAllAchievementDefinitions } from "../src/lib/achievement-catalog";
import { buildLevelTable } from "../src/lib/level-system";

export async function seedAchievementsAndLevels(prisma: PrismaClient) {
  const levels = buildLevelTable();
  for (const l of levels) {
    await prisma.level.upsert({
      where: { id: l.id },
      create: l,
      update: l,
    });
  }

  const achievements = getAllAchievementDefinitions();
  for (const a of achievements) {
    await prisma.achievement.upsert({
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
    });
  }

  console.log(`Seeded ${levels.length} levels, ${achievements.length} achievements`);
}

export async function seedExtendedChallenges(prisma: PrismaClient) {
  const challenges = [
    {
      slug: "daily-steps-10k",
      title: "10.000 Schritte heute",
      description: "Heute mindestens 10.000 Schritte",
      xpReward: 50,
      targetDays: 1,
      category: "activity",
      period: "daily",
    },
    {
      slug: "daily-protein-150",
      title: "150g Protein heute",
      description: "Proteinziel heute erreichen",
      xpReward: 40,
      targetDays: 1,
      category: "nutrition",
      period: "daily",
    },
    {
      slug: "daily-water-3l",
      title: "3 Liter Wasser heute",
      description: "Heute 3L Wasser trinken",
      xpReward: 35,
      targetDays: 1,
      category: "nutrition",
      period: "daily",
    },
    {
      slug: "workouts-4-week",
      title: "4 Trainings diese Woche",
      description: "4 Workouts in 7 Tagen",
      xpReward: 250,
      targetDays: 4,
      category: "training",
      period: "weekly",
    },
    {
      slug: "steps-week-70k",
      title: "70.000 Schritte / Woche",
      description: "70.000 Schritte in dieser Woche",
      xpReward: 200,
      targetDays: 70000,
      category: "activity",
      period: "weekly",
    },
    {
      slug: "protein-150-daily",
      title: "150g Protein · 7 Tage",
      description: "7 Tage Proteinziel",
      xpReward: 200,
      targetDays: 7,
      category: "nutrition",
      period: "weekly",
    },
    {
      slug: "water-3l-daily",
      title: "3L Wasser · 7 Tage",
      description: "7 Tage Hydration",
      xpReward: 150,
      targetDays: 7,
      category: "nutrition",
      period: "weekly",
    },
    {
      slug: "sleep-8h",
      title: "8h Schlaf · 7 Nächte",
      description: "7 Nächte mit 8h+ Schlaf",
      xpReward: 180,
      targetDays: 7,
      category: "recovery",
      period: "weekly",
    },
    {
      slug: "steps-30d-10k",
      title: "30 Tage 10k Schritte",
      description: "30 Tage mind. 10.000 Schritte",
      xpReward: 400,
      targetDays: 30,
      category: "activity",
      period: "monthly",
    },
    {
      slug: "month-trainings-16",
      title: "16 Trainings / Monat",
      description: "16 Workouts in 30 Tagen",
      xpReward: 350,
      targetDays: 16,
      category: "training",
      period: "monthly",
    },
  ];

  for (const c of challenges) {
    await prisma.challenge.upsert({
      where: { slug: c.slug },
      create: c,
      update: c,
    });
  }
}
