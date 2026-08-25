import { prisma } from "@/lib/prisma";
import { startOfWeek } from "date-fns";
import { buildWeeklyReport, type WeeklyReport } from "@/lib/weekly-report";
import type { WeeklyIntelligenceContext } from "@/lib/intelligence/weekly/context";
import { detectSessionImprovement } from "@/lib/intelligence/load-context";

export async function loadWeeklyIntelligenceContext(
  userId: string,
  partial?: Partial<WeeklyIntelligenceContext> & { weeklyReport?: WeeklyReport }
): Promise<WeeklyIntelligenceContext> {
  const now = partial?.now ?? new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  const [weeklyReport, profile, trainingStreak, prsThisWeek, lastSessions] =
    await Promise.all([
      partial?.weeklyReport
        ? Promise.resolve(partial.weeklyReport)
        : buildWeeklyReport(userId),
      prisma.profile
        .findUnique({
          where: { userId },
          select: {
            workoutDaysPerWeek: true,
            nutritionGoal: true,
            trainingGoal: true,
            calorieTarget: true,
            proteinTargetG: true,
            weightKg: true,
          },
        })
        .catch(() => null),
      prisma.trainingStreak
        .findUnique({ where: { userId }, select: { currentDays: true } })
        .catch(() => null),
      prisma.personalRecord
        .findMany({
          where: { userId, achievedAt: { gte: weekStart } },
          orderBy: { achievedAt: "desc" },
          take: 5,
          include: { exercise: { select: { name: true } } },
        })
        .catch(() => []),
      prisma.workoutSession
        .findMany({
          where: { userId, status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
          take: 2,
          select: {
            completedAt: true,
            name: true,
            sets: {
              where: { completed: true },
              select: {
                reps: true,
                weightKg: true,
                exerciseLibraryId: true,
                exercise: { select: { name: true } },
              },
            },
          },
        })
        .catch(() => []),
    ]);

  const last = lastSessions[0] ?? null;
  const prev = lastSessions[1] ?? null;

  return {
    now,
    weekLabel: partial?.weekLabel ?? weeklyReport.weekLabel,
    weeklyReport,
    plannedWorkoutsPerWeek:
      partial?.plannedWorkoutsPerWeek ??
      profile?.workoutDaysPerWeek ??
      null,
    nutritionGoal: partial?.nutritionGoal ?? profile?.nutritionGoal ?? null,
    trainingGoal: partial?.trainingGoal ?? profile?.trainingGoal ?? null,
    calorieTarget: partial?.calorieTarget ?? profile?.calorieTarget ?? null,
    proteinTarget: partial?.proteinTarget ?? profile?.proteinTargetG ?? null,
    trainingStreakDays:
      partial?.trainingStreakDays ?? trainingStreak?.currentDays ?? 0,
    prsThisWeek: prsThisWeek.map((p) => ({
      exerciseName: p.exercise.name,
      weightKg: p.weightKg ?? p.value,
      achievedAt: p.achievedAt,
    })),
    sessionImprovement:
      partial?.sessionImprovement ??
      detectSessionImprovement(last, prev),
    currentWeightKg: partial?.currentWeightKg ?? profile?.weightKg ?? null,
  };
}
