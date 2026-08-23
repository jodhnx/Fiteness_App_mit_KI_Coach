import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { loadTrainingSnapshot } from "@/lib/training-snapshot";
import { loadHealthDashboard } from "@/lib/activity-health";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";
import {
  createEmptyHomeData,
  normalizeHomeData,
  type HomeDataPayload,
} from "@/lib/home-defaults";
import { nutritionDashboardToHomeMacros } from "@/lib/nutrition-to-home";
import { createEmptyNutritionDashboard } from "@/lib/nutrition-defaults";
import { computeWeightGoalProgress } from "@/lib/smart-goals";
import { buildHomeCoachFromNutrition } from "@/lib/nutrition-coach";
import { loadNutritionStreak } from "@/lib/nutrition-streak";
import { sessionDurationSec, setVolume } from "@/lib/workout-metrics";

/**
 * Fast home payload for boot — no weekly reports, gamification, recovery DB,
 * extended health, or heavy chart prep. Keeps initial load under ~2s target.
 */
export async function loadHomeCriticalData(userId: string): Promise<HomeDataPayload> {
  try {
    const today = startOfDay(new Date());

    const [
      nutrition,
      training,
      health,
      user,
      profile,
      trainingStreakRow,
      nutritionStreakRow,
      lastSession,
      weightStart,
    ] = await Promise.all([
      loadNutritionDashboard(userId, today).catch(() => createEmptyNutritionDashboard()),
      loadTrainingSnapshot(userId).catch(() => null),
      loadHealthDashboard(userId).catch(() => null),
      prisma.user
        .findUnique({
          where: { id: userId },
          select: { name: true, image: true },
        })
        .catch(() => null),
      prisma.profile
        .findUnique({
          where: { userId },
          select: {
            weightKg: true,
            targetWeightKg: true,
            targetWeightDate: true,
          },
        })
        .catch(() => null),
      prisma.trainingStreak
        .findUnique({ where: { userId }, select: { currentDays: true } })
        .catch(() => null),
      loadNutritionStreak(userId).catch(() => ({
        currentDays: 0,
        longestDays: 0,
        lastTrackedAt: null,
        effectiveDays: 0,
      })),
      prisma.workoutSession
        .findFirst({
          where: { userId, status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
          select: {
            completedAt: true,
            name: true,
            startedAt: true,
            sets: {
              where: { completed: true },
              select: { reps: true, weightKg: true, exerciseLibraryId: true },
            },
          },
        })
        .catch(() => null),
      prisma.progressEntry
        .findFirst({
          where: { userId, weightKg: { not: null } },
          orderBy: { date: "asc" },
          select: { weightKg: true },
        })
        .catch(() => null),
    ]);

    const macroSlice = nutritionDashboardToHomeMacros(nutrition);
    const weightGoal =
      profile && computeWeightGoalProgress(profile, weightStart?.weightKg ?? null);

    return normalizeHomeData({
      ...macroSlice,
      nutrition,
      weightKg: training?.weightKg ?? profile?.weightKg ?? null,
      streak: training?.streak ?? null,
      trainingStreak:
        trainingStreakRow != null
          ? { currentDays: trainingStreakRow.currentDays }
          : training?.trainingStreak ?? training?.streak ?? null,
      nutritionStreak: {
        currentDays: nutritionStreakRow.effectiveDays,
        longestDays: nutritionStreakRow.longestDays,
      },
      activeSession: training?.activeSession ?? null,
      nextWorkout: training?.nextWorkout ?? null,
      coach: buildHomeCoachFromNutrition(nutrition),
      activityWeek: training?.activityWeek ?? createEmptyHomeData().activityWeek,
      userName: user?.name ?? null,
      userImage: user?.image ?? null,
      healthToday: health
        ? {
            steps: health.today.steps,
            stepGoal: health.today.stepGoal,
            activeMinutes: health.today.activeMinutes,
            activeMinuteGoal: health.goals.activeMinuteGoal,
            caloriesBurned: health.today.caloriesBurned,
            distanceM: health.today.distanceM,
            stepStreak: health.stepStreak,
            sleepHours: null,
            restingHeartRate: null,
            recoveryScore: null,
            trainingReadiness: null,
          }
        : null,
      caloriesBurnedTotal: health?.today?.caloriesBurned ?? 0,
      weightGoal: weightGoal
        ? {
            currentKg: weightGoal.currentKg,
            targetKg: weightGoal.targetKg,
            percent: weightGoal.percent,
            daysRemaining: weightGoal.daysRemaining,
          }
        : null,
      lastCompletedWorkout: lastSession?.completedAt
        ? {
            name: lastSession.name ?? "Training",
            completedAt: lastSession.completedAt.toISOString(),
            durationSec: sessionDurationSec(
              lastSession.startedAt,
              lastSession.completedAt
            ),
            exerciseCount: new Set(
              lastSession.sets
                .map((s) => s.exerciseLibraryId)
                .filter((id): id is string => Boolean(id))
            ).size,
            volumeKg: Math.round(
              lastSession.sets.reduce(
                (acc, s) => acc + setVolume(s.reps, s.weightKg),
                0
              )
            ),
          }
        : null,
    });
  } catch (e) {
    console.error("[loadHomeCriticalData]", e);
    return createEmptyHomeData();
  }
}
