import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { loadTrainingSnapshot } from "@/lib/training-snapshot";
import { buildCoachInsightsFromContext } from "@/lib/coach-insights";
import { getActivityWeekSummary, getRecentActivity } from "@/lib/activity-service";
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

/** Single bundled home load — no duplicate DB work inside coach insights. */
export async function loadHomeData(userId: string): Promise<HomeDataPayload> {
  try {
    const today = startOfDay(new Date());

    const [nutrition, training, health, activityWeek, recentActivity, user, profile, trainingStreak, lastSession, weightStart] =
      await Promise.all([
        loadNutritionDashboard(userId, today).catch((e) => {
          console.error("[loadHomeData] nutrition", e);
          return createEmptyNutritionDashboard();
        }),
        loadTrainingSnapshot(userId).catch((e) => {
          console.error("[loadHomeData] training", e);
          return null;
        }),
        loadHealthDashboard(userId).catch(() => null),
        getActivityWeekSummary(userId).catch(() => createEmptyHomeData().activityWeek),
        getRecentActivity(userId).catch(() => null),
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
              trainingGoal: true,
              nutritionGoal: true,
              weightKg: true,
              targetWeightKg: true,
              targetWeightDate: true,
            },
          })
          .catch(() => null),
        prisma.trainingStreak
          .findUnique({ where: { userId }, select: { currentDays: true } })
          .catch(() => null),
        prisma.workoutSession
          .findFirst({
            where: { userId, status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
            select: { completedAt: true, name: true },
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

    const week = {
      count: activityWeek.count,
      totalDurationSec: activityWeek.totalDurationSec ?? 0,
      totalDistanceM: activityWeek.totalDistanceM,
      totalCalories: activityWeek.totalCalories ?? 0,
    };

    const coach = buildCoachInsightsFromContext({
      nutrition,
      health,
      activityWeek: week,
      profile,
      trainingStreak,
      lastSession,
    });

    const weightGoal =
      profile && computeWeightGoalProgress(profile, weightStart?.weightKg ?? null);

    const macroSlice = nutritionDashboardToHomeMacros(nutrition);

    return normalizeHomeData({
      ...macroSlice,
      nutrition,
      weightKg: training?.weightKg ?? null,
      streak: training?.streak ?? null,
      trainingStreak: training?.trainingStreak ?? training?.streak ?? null,
      activeSession: training?.activeSession ?? null,
      nextWorkout: training?.nextWorkout ?? null,
      coach,
      activityWeek: week,
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
          }
        : null,
      caloriesBurnedTotal: health?.calorieBurn?.totalBurned ?? 0,
      caloriesBurnGoal: health?.calorieBurn?.bmr ?? nutrition.targets.calories,
      calorieBurnDetail: health?.calorieBurn
        ? `BMR ${health.calorieBurn.bmrToday} + Aktivität ${health.calorieBurn.activityCalories} + Schritte ${health.calorieBurn.stepCalories} kcal`
        : null,
      recentActivity: recentActivity
        ? {
            type: recentActivity.type,
            startedAt: recentActivity.startedAt.toISOString(),
            durationSec: recentActivity.durationSec,
            distanceM: recentActivity.distanceM,
          }
        : null,
      weightGoal: weightGoal
        ? {
            currentKg: weightGoal.currentKg,
            targetKg: weightGoal.targetKg,
            percent: weightGoal.percent,
            daysRemaining: weightGoal.daysRemaining,
          }
        : null,
    });
  } catch (e) {
    console.error("[loadHomeData] fatal", e);
    return createEmptyHomeData();
  }
}
