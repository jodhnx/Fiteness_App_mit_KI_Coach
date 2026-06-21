import type { PlanTemplateType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCatalogPlan, type CatalogPlan } from "@/lib/plan-catalog";
import type { CatalogExerciseEntry } from "@/lib/plan-catalog-builders";

export { PLAN_CATALOG, filterCatalogPlans, getCatalogPlan } from "@/lib/plan-catalog";

/** @deprecated use PLAN_CATALOG */
export const PRESET_PLANS = Object.fromEntries(
  [] as [string, unknown][]
) as Record<Exclude<PlanTemplateType, "CUSTOM">, never>;

export async function createPlanFromCatalog(
  userId: string,
  catalogKey: string,
  customName?: string
) {
  const preset = getCatalogPlan(catalogKey);
  if (!preset) throw new Error("Unknown catalog plan");
  return materializePlan(userId, preset, customName);
}

export async function createPlanFromTemplate(
  userId: string,
  template: PlanTemplateType,
  customName?: string
) {
  const preset = getCatalogPlan(template);
  if (!preset) throw new Error("Unknown template");
  return materializePlan(userId, preset, customName);
}

async function materializePlan(userId: string, preset: CatalogPlan, customName?: string) {
  const slugs = preset.days.flatMap((d) =>
    d.entries?.length ? d.entries.map((e) => e.slug) : d.exerciseSlugs
  );
  const exercises = await prisma.exerciseLibrary.findMany({
    where: { slug: { in: slugs } },
  });
  const bySlug = new Map(exercises.map((e) => [e.slug, e.id]));

  return prisma.workoutPlan.create({
    data: {
      userId,
      name: customName ?? preset.name,
      template: preset.template,
      sourceTemplate: preset.template,
      description: preset.description,
      isPreset: false,
      days: {
        create: preset.days.map((day, i) => {
          const entries: CatalogExerciseEntry[] =
            day.entries ??
            day.exerciseSlugs.map((slug) => ({
              slug,
              targetSets: day.targetSets,
              targetReps: day.targetReps,
              restSeconds: day.restSeconds,
            }));
          return {
            name: day.name,
            description: day.description ?? null,
            dayOrder: i,
            exercises: {
              create: entries
                .map((entry, j) => {
                  const libId = bySlug.get(entry.slug);
                  if (!libId) return null;
                  return {
                    exerciseLibraryId: libId,
                    orderIndex: j,
                    targetSets: entry.targetSets ?? day.targetSets ?? 3,
                    targetReps: entry.targetReps ?? day.targetReps ?? "8-12",
                    restSeconds: entry.restSeconds ?? day.restSeconds ?? 90,
                    notes: entry.notes ?? null,
                  };
                })
                .filter(Boolean) as {
                exerciseLibraryId: string;
                orderIndex: number;
                targetSets: number;
                targetReps: string;
                restSeconds: number;
                notes: string | null;
              }[],
            },
          };
        }),
      },
    },
    include: {
      days: { include: { exercises: { include: { exercise: true } } } },
    },
  });
}

export async function duplicateWorkoutPlan(userId: string, planId: string) {
  const source = await prisma.workoutPlan.findFirst({
    where: { id: planId, userId },
    include: {
      days: {
        orderBy: { dayOrder: "asc" },
        include: { exercises: { orderBy: { orderIndex: "asc" } } },
      },
    },
  });
  if (!source) throw new Error("Plan nicht gefunden");

  return prisma.workoutPlan.create({
    data: {
      userId,
      name: `${source.name} (Kopie)`,
      template: source.template,
      sourceTemplate: source.sourceTemplate,
      description: source.description,
      days: {
        create: source.days.map((day) => ({
          name: day.name,
          description: day.description,
          dayOrder: day.dayOrder,
          exercises: {
            create: day.exercises.map((ex) => ({
              exerciseLibraryId: ex.exerciseLibraryId,
              orderIndex: ex.orderIndex,
              targetSets: ex.targetSets,
              targetReps: ex.targetReps,
              restSeconds: ex.restSeconds,
              notes: ex.notes,
            })),
          },
        })),
      },
    },
    include: {
      days: { include: { exercises: { include: { exercise: true } } } },
    },
  });
}

export async function recordExerciseUsage(userId: string, exerciseLibraryIds: string[]) {
  const unique = [...new Set(exerciseLibraryIds.filter(Boolean))];
  for (const exerciseLibraryId of unique) {
    await prisma.recentExercise.upsert({
      where: { userId_exerciseLibraryId: { userId, exerciseLibraryId } },
      create: { userId, exerciseLibraryId, useCount: 1 },
      update: { lastUsedAt: new Date(), useCount: { increment: 1 } },
    });
    await prisma.exerciseLibrary.update({
      where: { id: exerciseLibraryId },
      data: { usageCount: { increment: 1 } },
    });
  }
}

export async function updateTrainingStreak(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const streak = await prisma.trainingStreak.findUnique({ where: { userId } });
  if (!streak) {
    return prisma.trainingStreak.create({
      data: { userId, currentDays: 1, longestDays: 1, lastWorkoutAt: today },
    });
  }
  const last = streak.lastWorkoutAt ? new Date(streak.lastWorkoutAt) : null;
  if (last) {
    last.setHours(0, 0, 0, 0);
    const diff = (today.getTime() - last.getTime()) / 86400000;
    if (diff === 0) return streak;
    if (diff === 1) {
      const currentDays = streak.currentDays + 1;
      return prisma.trainingStreak.update({
        where: { userId },
        data: {
          currentDays,
          longestDays: Math.max(streak.longestDays, currentDays),
          lastWorkoutAt: today,
        },
      });
    }
  }
  return prisma.trainingStreak.update({
    where: { userId },
    data: { currentDays: 1, lastWorkoutAt: today },
  });
}
