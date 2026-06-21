import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";

/** Safe defaults for /api/home and Home page — never null top-level fields */

export type HomeCoach = {
  summary: string;
  tips: {
    type: string;
    message: string;
    priority: string;
    actionHref?: string;
  }[];
};

export type HomeDataPayload = {
  caloriesIntake: number;
  calorieTarget: number;
  caloriesRemaining: number;
  proteinConsumed: number;
  proteinTarget: number;
  proteinRemaining: number;
  weightKg: number | null;
  streak: { currentDays: number; longestDays?: number } | null;
  trainingStreak: { currentDays: number; longestDays?: number } | null;
  activeSession: { id: string } | null;
  coach: HomeCoach;
  activityWeek: {
    count: number;
    totalDistanceM: number;
    totalDurationSec?: number;
    totalCalories?: number;
  };
  nextWorkout: {
    planName: string;
    dayName: string;
    planId: string;
    dayId?: string;
    exerciseCount?: number;
    estimatedDurationMin?: number;
  } | null;
  recentActivity?: {
    type: string;
    startedAt: string;
    durationSec: number;
    distanceM: number | null;
  } | null;
  healthToday?: {
    steps: number;
    stepGoal: number;
    activeMinutes: number;
    activeMinuteGoal: number;
    caloriesBurned: number;
    distanceM: number;
    stepStreak: number;
  } | null;
  userName?: string | null;
  userImage?: string | null;
  caloriesBurnedTotal?: number;
  caloriesBurnGoal?: number;
  calorieBurnDetail?: string | null;
  /** Full nutrition payload — avoids second /api/nutrition/dashboard on home */
  nutrition?: NutritionDashboardPayload;
  recovery?: {
    highlights: { label: string; recoveryPercent: number }[];
    muscles?: {
      muscle: string;
      label: string;
      recoveryPercent: number;
      status: string;
      volume7d: number;
      lastTrainedAt: string | null;
      recoveryHoursRequired: number;
      setsLastSession: number;
    }[];
  };
  weeklyReport?: {
    weekLabel: string;
    workouts: number;
    avgProteinG: number;
    avgCaloriesKcal?: number;
    totalSteps: number;
    avgSleepHours: number | null;
    weightChangeKg: number | null;
    goalReached: boolean;
    summaryLine: string;
    aiSummary?: string;
  };
  weightGoal?: {
    currentKg: number;
    targetKg: number;
    percent: number;
    daysRemaining: number;
  } | null;
  gamification?: {
    totalXP: number;
    level: number;
    levelName: string;
    progressPercent: number;
    xpToNext: number;
    unlockedCount: number;
    totalAchievements: number;
    latestAchievement: { name: string; icon: string; tier: string } | null;
    activeChallenge: { title: string; progress: number; target: number } | null;
  };
  challenges?: {
    id: string;
    title: string;
    progress: number;
    target: number;
    tier: string;
  }[];
  bodyTransformation?: {
    startKg: number;
    currentKg: number;
    targetKg: number | null;
    progressPercent: number;
  } | null;
  recentAchievements?: {
    name: string;
    icon: string;
    tier: string;
    earnedAt: string;
  }[];
  lastCompletedWorkout?: {
    name: string;
    completedAt: string;
    durationSec?: number;
    exerciseCount?: number;
    volumeKg?: number;
  } | null;
};

export function createEmptyHomeData(): HomeDataPayload {
  return {
    caloriesIntake: 0,
    calorieTarget: 0,
    caloriesRemaining: 0,
    proteinConsumed: 0,
    proteinTarget: 0,
    proteinRemaining: 0,
    weightKg: null,
    streak: null,
    trainingStreak: null,
    activeSession: null,
    coach: {
      summary: "Starte mit Ernährung oder Training – dann gibt es personalisierte Tipps.",
      tips: [],
    },
    activityWeek: { count: 0, totalDistanceM: 0, totalDurationSec: 0, totalCalories: 0 },
    nextWorkout: null,
    recentActivity: null,
    healthToday: null,
    userName: null,
    lastCompletedWorkout: null,
  };
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeHomeData(raw: unknown): HomeDataPayload {
  const base = createEmptyHomeData();
  if (!raw || typeof raw !== "object") return base;

  const d = raw as Record<string, unknown>;
  const coachRaw = d.coach;
  const coach: HomeCoach =
    coachRaw && typeof coachRaw === "object"
      ? {
          summary:
            typeof (coachRaw as HomeCoach).summary === "string"
              ? (coachRaw as HomeCoach).summary
              : base.coach.summary,
          tips: Array.isArray((coachRaw as HomeCoach).tips)
            ? (coachRaw as HomeCoach).tips
            : [],
        }
      : base.coach;

  const activityRaw = d.activityWeek;
  const activityWeek =
    activityRaw && typeof activityRaw === "object"
      ? {
          count: num((activityRaw as { count?: number }).count, 0),
          totalDistanceM: num((activityRaw as { totalDistanceM?: number }).totalDistanceM, 0),
          totalDurationSec: num(
            (activityRaw as { totalDurationSec?: number }).totalDurationSec,
            0
          ),
          totalCalories: num((activityRaw as { totalCalories?: number }).totalCalories, 0),
        }
      : base.activityWeek;

  const streak =
    d.streak && typeof d.streak === "object"
      ? { currentDays: num((d.streak as { currentDays?: number }).currentDays, 0) }
      : null;

  const trainingStreak =
    d.trainingStreak && typeof d.trainingStreak === "object"
      ? { currentDays: num((d.trainingStreak as { currentDays?: number }).currentDays, 0) }
      : streak;

  const nextWorkout =
    d.nextWorkout && typeof d.nextWorkout === "object"
      ? (d.nextWorkout as HomeDataPayload["nextWorkout"])
      : null;

  const activeSession =
    d.activeSession && typeof d.activeSession === "object" && "id" in d.activeSession
      ? { id: String((d.activeSession as { id: string }).id) }
      : null;

  return {
    ...base,
    caloriesIntake: num(d.caloriesIntake, base.caloriesIntake),
    calorieTarget: num(d.calorieTarget, base.calorieTarget),
    caloriesRemaining: num(d.caloriesRemaining, base.caloriesRemaining),
    proteinConsumed: num(d.proteinConsumed, base.proteinConsumed),
    proteinTarget: num(d.proteinTarget, base.proteinTarget),
    proteinRemaining: num(d.proteinRemaining, base.proteinRemaining),
    weightKg:
      d.weightKg != null && Number.isFinite(Number(d.weightKg)) ? Number(d.weightKg) : null,
    streak,
    trainingStreak,
    activeSession,
    coach,
    activityWeek,
    nextWorkout,
    recentActivity:
      d.recentActivity && typeof d.recentActivity === "object"
        ? (d.recentActivity as HomeDataPayload["recentActivity"])
        : null,
    healthToday:
      d.healthToday && typeof d.healthToday === "object"
        ? (d.healthToday as HomeDataPayload["healthToday"])
        : null,
    userName: typeof d.userName === "string" ? d.userName : null,
    userImage: typeof d.userImage === "string" ? d.userImage : null,
    caloriesBurnedTotal: num(d.caloriesBurnedTotal, 0),
    caloriesBurnGoal: num(d.caloriesBurnGoal, base.calorieTarget),
    calorieBurnDetail: typeof d.calorieBurnDetail === "string" ? d.calorieBurnDetail : null,
    nutrition:
      d.nutrition && typeof d.nutrition === "object"
        ? (d.nutrition as NutritionDashboardPayload)
        : undefined,
    recovery:
      d.recovery && typeof d.recovery === "object"
        ? (d.recovery as HomeDataPayload["recovery"])
        : undefined,
    weeklyReport:
      d.weeklyReport && typeof d.weeklyReport === "object"
        ? (d.weeklyReport as HomeDataPayload["weeklyReport"])
        : undefined,
    weightGoal:
      d.weightGoal && typeof d.weightGoal === "object"
        ? (d.weightGoal as HomeDataPayload["weightGoal"])
        : d.weightGoal === null
          ? null
          : undefined,
    gamification:
      d.gamification && typeof d.gamification === "object"
        ? (d.gamification as HomeDataPayload["gamification"])
        : undefined,
    challenges: Array.isArray(d.challenges)
      ? (d.challenges as HomeDataPayload["challenges"])
      : undefined,
    bodyTransformation:
      d.bodyTransformation && typeof d.bodyTransformation === "object"
        ? (d.bodyTransformation as HomeDataPayload["bodyTransformation"])
        : d.bodyTransformation === null
          ? null
          : undefined,
    recentAchievements: Array.isArray(d.recentAchievements)
      ? (d.recentAchievements as HomeDataPayload["recentAchievements"])
      : undefined,
    lastCompletedWorkout:
      d.lastCompletedWorkout && typeof d.lastCompletedWorkout === "object"
        ? (d.lastCompletedWorkout as HomeDataPayload["lastCompletedWorkout"])
        : null,
  };
}

export function isValidHomePayload(data: unknown): data is HomeDataPayload {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.calorieTarget === "number" &&
    d.coach != null &&
    typeof d.coach === "object" &&
    d.activityWeek != null &&
    typeof d.activityWeek === "object"
  );
}
