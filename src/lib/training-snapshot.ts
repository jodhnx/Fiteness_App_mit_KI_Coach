import { loadDashboardStats } from "@/lib/dashboard-data";

/** Non-nutrition home fields (workouts, streak, weight) */
export async function loadTrainingSnapshot(userId: string) {
  const stats = await loadDashboardStats(userId);
  return {
    weightKg: stats.weightKg,
    streak: stats.streak,
    trainingStreak: stats.trainingStreak,
    activeSession: stats.activeSession,
    nextWorkout: stats.activePlan
      ? {
          planName: stats.activePlan.name,
          dayName: stats.activePlan.days[0]?.name ?? "Training",
          planId: stats.activePlan.id,
          dayId: stats.activePlan.days[0]?.id,
          exerciseCount: stats.activePlan.days[0]?._count?.exercises ?? 0,
          estimatedDurationMin: Math.max(
            30,
            Math.min(120, (stats.activePlan.days[0]?._count?.exercises ?? 6) * 8 + 10)
          ),
        }
      : null,
    activityWeek: { count: 0, totalDistanceM: 0 },
  };
}
