import { prisma } from "@/lib/prisma";
import { computePRUpdates } from "@/lib/workout-metrics";

/**
 * Fill-forward PRs from completed history.
 * Never deletes and never lowers an existing record — only inserts missing /
 * higher values so old cross-exercise bugs get corrected safely.
 */
export async function upsertMissingPersonalRecords(userId: string): Promise<number> {
  const sets = await prisma.workoutSet.findMany({
    where: {
      completed: true,
      exerciseLibraryId: { not: null },
      session: { userId, status: "COMPLETED" },
    },
    select: {
      exerciseLibraryId: true,
      exerciseName: true,
      setNumber: true,
      reps: true,
      weightKg: true,
      completed: true,
    },
    take: 1500,
    orderBy: { id: "asc" },
  });

  const existing = await prisma.personalRecord.findMany({
    where: { userId },
    select: { recordType: true, value: true, exerciseLibraryId: true },
  });

  const updates = computePRUpdates(sets, existing);
  for (const pr of updates) {
    await prisma.personalRecord.upsert({
      where: {
        userId_exerciseLibraryId_recordType: {
          userId,
          exerciseLibraryId: pr.exerciseLibraryId,
          recordType: pr.recordType,
        },
      },
      create: {
        userId,
        exerciseLibraryId: pr.exerciseLibraryId,
        recordType: pr.recordType,
        value: pr.value,
        reps: pr.reps,
        weightKg: pr.weightKg,
      },
      update: {
        value: pr.value,
        reps: pr.reps,
        weightKg: pr.weightKg,
        achievedAt: new Date(),
      },
    });
  }
  return updates.length;
}
