import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { loadTrainingSnapshot } from "@/lib/training-snapshot";
import { buildCoachInsightsFromContext } from "@/lib/coach-insights";
import { getActivityWeekSummary, getRecentActivity } from "@/lib/activity-service";
import { loadHealthDashboard } from "@/lib/activity-health";
import { loadExtendedHealthDashboard } from "@/lib/health/health-dashboard";
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
import { buildWeeklyReport } from "@/lib/weekly-report";
import { loadMuscleRecovery } from "@/lib/recovery-service";
import { filterDisplayMuscles } from "@/lib/recovery-shared";
import { loadGamificationHomeCard } from "@/lib/gamification-home";
import { loadChallengesWithProgress } from "@/lib/challenge-progress";
import { buildBodyTransformation } from "@/lib/body-transformation";
import type { GamificationSummary } from "@/lib/gamification";
import { sessionDurationSec, setVolume } from "@/lib/workout-metrics";

function gamificationToHome(g: GamificationSummary): HomeDataPayload["gamification"] {
  return {
    totalXP: g.totalXP,
    level: g.level.level,
    levelName: g.level.name,
    progressPercent: g.level.progressPercent,
    xpToNext: g.level.xpToNext,
    unlockedCount: g.unlockedCount,
    totalAchievements: g.totalAchievements,
    latestAchievement: g.latestAchievement,
    activeChallenge: g.activeChallenge
      ? {
          title: g.activeChallenge.title,
          progress: g.activeChallenge.progress,
          target: g.activeChallenge.target,
        }
      : null,
  };
}

export type HomeEnrichmentPayload = Pick<
  HomeDataPayload,
  | "activityWeek"
  | "recentActivity"
  | "recovery"
  | "weeklyReport"
  | "gamification"
  | "challenges"
  | "bodyTransformation"
  | "recentAchievements"
  | "calorieBurnDetail"
> & {
  healthTodayExtras?: Pick<
    NonNullable<HomeDataPayload["healthToday"]>,
    "sleepHours" | "restingHeartRate" | "recoveryScore" | "trainingReadiness"
  >;
};

/**
 * Background home extras — skips nutrition / training / basic health already
 * loaded by bootstrap (`loadHomeCriticalData`).
 */
export async function loadHomeEnrichment(
  userId: string
): Promise<HomeEnrichmentPayload> {
  const today = startOfDay(new Date());
  const [
    healthMetric,
    activityWeek,
    recentActivity,
    profile,
    weightStart,
    weeklyReport,
    recovery,
    gamificationRaw,
    challengesRaw,
    weightEntries,
    recentAchievementsRaw,
  ] = await Promise.all([
    prisma.dailyHealthMetric
      .findFirst({
        where: { userId, date: today },
        select: {
          sleepHours: true,
          restingHeartRate: true,
          recoveryScore: true,
          trainingReadiness: true,
        },
      })
      .catch(() => null),
    getActivityWeekSummary(userId).catch(() => createEmptyHomeData().activityWeek),
    getRecentActivity(userId).catch(() => null),
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
    prisma.progressEntry
      .findFirst({
        where: { userId, weightKg: { not: null } },
        orderBy: { date: "asc" },
        select: { weightKg: true },
      })
      .catch(() => null),
    buildWeeklyReport(userId).catch(() => null),
    loadMuscleRecovery(userId).catch(() => null),
    loadGamificationHomeCard(userId).catch(() => null),
    loadChallengesWithProgress(userId, { syncDb: false }).catch(() => []),
    prisma.progressEntry
      .findMany({
        where: { userId, weightKg: { not: null } },
        orderBy: { date: "asc" },
        take: 60,
        select: { date: true, weightKg: true },
      })
      .catch(() => []),
    prisma.userAchievement
      .findMany({
        where: { userId },
        orderBy: { earnedAt: "desc" },
        take: 3,
        include: {
          achievement: { select: { name: true, icon: true, tier: true } },
        },
      })
      .catch(() => []),
  ]);

  const week = {
    count: activityWeek.count,
    totalDurationSec: activityWeek.totalDurationSec ?? 0,
    totalDistanceM: activityWeek.totalDistanceM,
    totalCalories: activityWeek.totalCalories ?? 0,
  };

  const activeChallenges = (challengesRaw ?? [])
    .filter((c) => c.status === "ACTIVE")
    .slice(0, 3)
    .map((c) => ({
      id: c.id,
      title: c.title,
      progress: c.progress,
      target: c.targetDays,
      tier: c.tier,
    }));

  const bodyFull = buildBodyTransformation(
    weightStart?.weightKg ?? null,
    profile?.weightKg ?? null,
    profile?.targetWeightKg ?? null,
    profile?.targetWeightDate ?? null,
    weightEntries.map((e) => ({ date: e.date, weightKg: e.weightKg }))
  );

  return {
    activityWeek: week,
    recentActivity: recentActivity
      ? {
          type: recentActivity.type,
          startedAt: recentActivity.startedAt.toISOString(),
          durationSec: recentActivity.durationSec,
          distanceM: recentActivity.distanceM,
        }
      : null,
    healthTodayExtras: healthMetric
      ? {
          sleepHours: healthMetric.sleepHours ?? null,
          restingHeartRate: healthMetric.restingHeartRate ?? null,
          recoveryScore: healthMetric.recoveryScore ?? null,
          trainingReadiness: healthMetric.trainingReadiness ?? null,
        }
      : undefined,
    recovery: recovery
      ? {
          highlights: recovery.highlights,
          muscles: filterDisplayMuscles(recovery.muscles),
        }
      : undefined,
    weeklyReport: weeklyReport
      ? {
          weekLabel: weeklyReport.weekLabel,
          workouts: weeklyReport.workouts,
          avgProteinG: weeklyReport.avgProteinG,
          avgCaloriesKcal: weeklyReport.avgCaloriesKcal,
          totalSteps: weeklyReport.totalSteps,
          avgSleepHours: weeklyReport.avgSleepHours,
          weightChangeKg: weeklyReport.weightChangeKg,
          goalReached: weeklyReport.goalReached,
          summaryLine: weeklyReport.summaryLine,
          aiSummary: weeklyReport.aiSummary,
        }
      : undefined,
    gamification: gamificationRaw ? gamificationToHome(gamificationRaw) : undefined,
    challenges: activeChallenges.length > 0 ? activeChallenges : undefined,
    bodyTransformation: bodyFull
      ? {
          startKg: bodyFull.startKg,
          currentKg: bodyFull.currentKg,
          targetKg: bodyFull.targetKg,
          progressPercent: bodyFull.progressPercent,
        }
      : null,
    recentAchievements: (recentAchievementsRaw ?? []).map((row) => ({
      name: row.achievement.name,
      icon: row.achievement.icon,
      tier: row.achievement.tier,
      earnedAt: row.earnedAt.toISOString(),
    })),
  };
}

/** Single bundled home load — no duplicate DB work inside coach insights. */
export async function loadHomeData(userId: string): Promise<HomeDataPayload> {
  try {
    const today = startOfDay(new Date());

    const [
      nutrition,
      training,
      health,
      healthEco,
      activityWeek,
      recentActivity,
      user,
      profile,
      trainingStreak,
      lastSession,
      weightStart,
      weeklyReport,
      recovery,
      gamificationRaw,
      challengesRaw,
      weightEntries,
      recentAchievementsRaw,
    ] = await Promise.all([
        loadNutritionDashboard(userId, today).catch((e) => {
          console.error("[loadHomeData] nutrition", e);
          return createEmptyNutritionDashboard();
        }),
        loadTrainingSnapshot(userId).catch((e) => {
          console.error("[loadHomeData] training", e);
          return null;
        }),
        loadHealthDashboard(userId).catch(() => null),
        loadExtendedHealthDashboard(userId).catch(() => null),
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
        buildWeeklyReport(userId).catch(() => null),
        loadMuscleRecovery(userId).catch(() => null),
        loadGamificationHomeCard(userId).catch(() => null),
        loadChallengesWithProgress(userId, { syncDb: false }).catch(() => []),
        prisma.progressEntry
          .findMany({
            where: { userId, weightKg: { not: null } },
            orderBy: { date: "asc" },
            take: 120,
            select: { date: true, weightKg: true },
          })
          .catch(() => []),
        prisma.userAchievement
          .findMany({
            where: { userId },
            orderBy: { earnedAt: "desc" },
            take: 3,
            include: {
              achievement: { select: { name: true, icon: true, tier: true } },
            },
          })
          .catch(() => []),
      ]);

    const week = {
      count: activityWeek.count,
      totalDurationSec: activityWeek.totalDurationSec ?? 0,
      totalDistanceM: activityWeek.totalDistanceM,
      totalCalories: activityWeek.totalCalories ?? 0,
    };

    const activeChallenges = (challengesRaw ?? [])
      .filter((c) => c.status === "ACTIVE")
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        title: c.title,
        progress: c.progress,
        target: c.targetDays,
        tier: c.tier,
      }));

    const coach = buildCoachInsightsFromContext({
      nutrition,
      health,
      activityWeek: week,
      profile,
      trainingStreak,
      lastSession,
      recovery,
      weeklyReport: weeklyReport
        ? {
            workouts: weeklyReport.workouts,
            avgProteinG: weeklyReport.avgProteinG,
            weightChangeKg: weeklyReport.weightChangeKg,
            avgSleepHours: weeklyReport.avgSleepHours,
            goalReached: weeklyReport.goalReached,
          }
        : null,
    });

    const weightGoal =
      profile && computeWeightGoalProgress(profile, weightStart?.weightKg ?? null);

    const macroSlice = nutritionDashboardToHomeMacros(nutrition);

    const bodyFull = buildBodyTransformation(
      weightStart?.weightKg ?? null,
      profile?.weightKg ?? training?.weightKg ?? null,
      profile?.targetWeightKg ?? null,
      profile?.targetWeightDate ?? null,
      weightEntries.map((e) => ({ date: e.date, weightKg: e.weightKg }))
    );

    const bodyTransformation = bodyFull
      ? {
          startKg: bodyFull.startKg,
          currentKg: bodyFull.currentKg,
          targetKg: bodyFull.targetKg,
          progressPercent: bodyFull.progressPercent,
        }
      : null;

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
            sleepHours: healthEco?.today.sleepHours ?? null,
            restingHeartRate: healthEco?.today.restingHeartRate ?? null,
            recoveryScore: healthEco?.regeneration.score ?? null,
            trainingReadiness: healthEco?.regeneration.trainingReadiness ?? null,
          }
        : null,
      caloriesBurnedTotal: health?.today?.caloriesBurned ?? 0,
      caloriesBurnGoal: 0,
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
      recovery: recovery
        ? {
            highlights: recovery.highlights,
            muscles: filterDisplayMuscles(recovery.muscles),
          }
        : undefined,
      weeklyReport: weeklyReport
        ? {
            weekLabel: weeklyReport.weekLabel,
            workouts: weeklyReport.workouts,
            avgProteinG: weeklyReport.avgProteinG,
            avgCaloriesKcal: weeklyReport.avgCaloriesKcal,
            totalSteps: weeklyReport.totalSteps,
            avgSleepHours: weeklyReport.avgSleepHours,
            weightChangeKg: weeklyReport.weightChangeKg,
            goalReached: weeklyReport.goalReached,
            summaryLine: weeklyReport.summaryLine,
            aiSummary: weeklyReport.aiSummary,
          }
        : undefined,
      gamification: gamificationRaw ? gamificationToHome(gamificationRaw) : undefined,
      challenges: activeChallenges.length > 0 ? activeChallenges : undefined,
      bodyTransformation,
      recentAchievements: (recentAchievementsRaw ?? []).map((row) => ({
        name: row.achievement.name,
        icon: row.achievement.icon,
        tier: row.achievement.tier,
        earnedAt: row.earnedAt.toISOString(),
      })),
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
    console.error("[loadHomeData] fatal", e);
    return createEmptyHomeData();
  }
}
