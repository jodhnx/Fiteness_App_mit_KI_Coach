import { prisma } from "@/lib/prisma";
import { isSchemaMismatchError } from "@/lib/prisma-errors";

const CHALLENGE_DEFS = [
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
] as const;

let seeding: Promise<void> | null = null;

/** Ensure challenge catalog rows exist. Safe if table missing (logs only). */
export async function ensureChallengeCatalog(): Promise<{ ok: boolean; count: number }> {
  try {
    const count = await prisma.challenge.count();
    if (count > 0) return { ok: true, count };

    if (!seeding) {
      seeding = (async () => {
        for (const c of CHALLENGE_DEFS) {
          await prisma.challenge.upsert({
            where: { slug: c.slug },
            create: { ...c },
            update: {
              title: c.title,
              description: c.description,
              xpReward: c.xpReward,
              targetDays: c.targetDays,
              category: c.category,
              period: c.period,
            },
          });
        }
      })().finally(() => {
        seeding = null;
      });
    }
    await seeding;
    return { ok: true, count: CHALLENGE_DEFS.length };
  } catch (e) {
    if (isSchemaMismatchError(e)) {
      console.error("[challenges] schema mismatch — challenge table unavailable", e);
      return { ok: false, count: 0 };
    }
    console.error("[challenges] ensure catalog failed", e);
    return { ok: false, count: 0 };
  }
}
