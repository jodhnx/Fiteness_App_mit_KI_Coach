import { loadDashboardStats } from "@/lib/dashboard-data";
import { loadNextWorkoutForUser } from "@/lib/plan-next-day";

/** Non-nutrition home fields (workouts, streak, weight) */
export async function loadTrainingSnapshot(userId: string) {
  const [stats, nextWorkout] = await Promise.all([
    loadDashboardStats(userId),
    loadNextWorkoutForUser(userId),
  ]);

  return {
    weightKg: stats.weightKg,
    streak: stats.streak,
    trainingStreak: stats.trainingStreak,
    activeSession: stats.activeSession,
    nextWorkout,
    activityWeek: { count: 0, totalDistanceM: 0 },
  };
}
