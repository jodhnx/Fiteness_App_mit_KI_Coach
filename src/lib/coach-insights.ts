import { prisma } from "@/lib/prisma";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { buildNutritionCoachTipsWithWater } from "@/lib/nutrition-coach";
import { getActivityWeekSummary } from "@/lib/activity-service";
import { loadHealthDashboard, type HealthDashboardPayload } from "@/lib/activity-health";
import type { RecoverySnapshot } from "@/lib/recovery-service";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { startOfDay } from "date-fns";

export type CoachInsight = {
  type: string;
  message: string;
  priority: "high" | "medium" | "low";
  actionHref?: string;
};

export type CoachInsightsResult = {
  summary: string;
  tips: CoachInsight[];
  weeklyReportText?: string;
  /** Structured status for the Coach dashboard UI */
  status?: {
    trainingDoneToday: boolean;
    trainingLabel: string;
    calories: { consumed: number; target: number } | null;
    protein: { consumed: number; target: number } | null;
    steps: number | null;
    sleepHours: number | null;
    recoveryPct: number | null;
    goal: string | null;
  };
  recommendations?: string[];
};

type CoachContext = {
  nutrition: NutritionDashboardPayload | null;
  health: HealthDashboardPayload | null;
  activityWeek: {
    count: number;
    totalDurationSec: number;
    totalDistanceM: number;
    totalCalories: number;
  };
  profile: {
    trainingGoal: string | null;
    nutritionGoal: string | null;
    weightKg: number | null;
  } | null;
  trainingStreak: { currentDays: number } | null;
  lastSession: { completedAt: Date | null; name: string | null } | null;
  recovery?: RecoverySnapshot | null;
  weeklyReport?: {
    workouts: number;
    avgProteinG: number;
    weightChangeKg: number | null;
    avgSleepHours: number | null;
    goalReached: boolean;
  } | null;
  sleepStats?: { avgHours: number | null; lowNightsLast7: number } | null;
  recentPr?: { exerciseName: string; value: number } | null;
  challengeNearComplete?: string | null;
};

export function buildCoachInsightsFromContext(ctx: CoachContext): CoachInsightsResult {
  const {
    nutrition,
    profile,
    trainingStreak,
    lastSession,
    activityWeek,
    health,
    recovery,
    weeklyReport,
    sleepStats,
    recentPr,
    challengeNearComplete,
  } = ctx;
  const tips: CoachInsight[] = [];

  if (nutrition) {
    const nutritionTips = buildNutritionCoachTipsWithWater(
      nutrition.consumed,
      nutrition.targets,
      nutrition.targets.nutritionGoal,
      nutrition.water.consumedMl,
      nutrition.water.targetMl
    );
    tips.push(
      ...nutritionTips.map((t) => ({
        ...t,
        priority: t.priority as CoachInsight["priority"],
        actionHref: "/nutrition",
      }))
    );
  }

  const daysSinceWorkout =
    lastSession?.completedAt != null
      ? Math.floor(
          (Date.now() - lastSession.completedAt.getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;

  if (daysSinceWorkout != null && daysSinceWorkout >= 3) {
    tips.unshift({
      type: "training",
      message: `Letztes Training vor ${daysSinceWorkout} Tagen – heute wäre ein guter Tag für ${lastSession?.name ?? "ein Workout"}.`,
      priority: "high",
      actionHref: "/workouts",
    });
  } else if ((trainingStreak?.currentDays ?? 0) >= 2) {
    tips.push({
      type: "training",
      message: `Training-Streak: ${trainingStreak?.currentDays ?? 0} Tage – stark, bleib dran!`,
      priority: "low",
      actionHref: "/workouts",
    });
  }

  if (health) {
    const stepsLeft = health.goals.dailyStepGoal - health.today.steps;
    if (stepsLeft > 500) {
      const walkMin = Math.max(15, Math.round(stepsLeft / 100));
      tips.unshift({
        type: "steps",
        message: `Ein ${walkMin}-minütiger Spaziergang würde dein Tagesziel erfüllen.`,
        priority: "medium",
        actionHref: "/progress",
      });
    }
  }

  if (recovery) {
    const legs = recovery.muscles.find((m) => m.muscle === "LEGS");
    if (legs && legs.recoveryPercent < 70) {
      tips.unshift({
        type: "recovery",
        message: "Deine Beine benötigen noch Regeneration.",
        priority: "high",
        actionHref: "/workouts/analytics",
      });
    }
    const fatigued = recovery.muscles.filter((m) => m.recoveryPercent < 55);
    if (fatigued.length >= 2) {
      tips.push({
        type: "recovery",
        message: `${fatigued.map((f) => f.label).join(", ")} brauchen mehr Pause — leichteres Training oder Ruhetag.`,
        priority: "medium",
        actionHref: "/progress",
      });
    }
  }

  if (daysSinceWorkout != null && daysSinceWorkout >= 2 && daysSinceWorkout < 3) {
    tips.unshift({
      type: "training",
      message: "Heute wäre ein Push-Training optimal – du bist ausgeruht genug.",
      priority: "high",
      actionHref: "/workouts",
    });
  }

  if (activityWeek.count === 0 && profile?.trainingGoal === "ENDURANCE") {
    tips.unshift({
      type: "activity",
      message: "Für dein Ausdauer-Ziel: tracke heute eine Aktivität (Laufen, Rad, Schwimmen).",
      priority: "high",
      actionHref: "/progress",
    });
  } else if (activityWeek.count > 0) {
    tips.push({
      type: "activity",
      message: `Diese Woche ${activityWeek.count} Aktivität(en), ${Math.round(activityWeek.totalDistanceM / 1000)} km – gut für Regeneration & Kalorienbalance.`,
      priority: "medium",
      actionHref: "/progress",
    });
  }

  if (profile?.nutritionGoal === "MUSCLE_GAIN" && nutrition) {
    const proteinPct =
      nutrition.targets.proteinG > 0
        ? nutrition.consumed.proteinG / nutrition.targets.proteinG
        : 0;
    if (proteinPct < 0.6 && nutrition.consumed.calories > 500) {
      tips.push({
        type: "goal",
        message: "Muskelaufbau-Ziel: erhöhe die Proteinzufuhr in den nächsten Mahlzeiten.",
        priority: "high",
        actionHref: "/nutrition",
      });
    }
  }

  if (sleepStats && sleepStats.lowNightsLast7 >= 3) {
    tips.unshift({
      type: "sleep",
      message:
        "Du hast die letzten 3 Nächte unter 6 Stunden geschlafen. Reduziere heute die Trainingsintensität.",
      priority: "high",
      actionHref: "/progress",
    });
  } else if (sleepStats?.avgHours != null && sleepStats.avgHours < 6.5) {
    tips.push({
      type: "sleep",
      message: `Durchschnittlich nur ${sleepStats.avgHours}h Schlaf diese Woche – Erholung priorisieren.`,
      priority: "medium",
      actionHref: "/progress",
    });
  }

  if (recentPr) {
    tips.unshift({
      type: "pr",
      message: `Neuer Rekord: ${recentPr.exerciseName} mit ${recentPr.value} kg – stark!`,
      priority: "high",
      actionHref: "/workouts/records",
    });
  }

  if (weeklyReport) {
    if (weeklyReport.goalReached) {
      tips.push({
        type: "weekly",
        message: "Wochenziel erreicht – deine Gewichtsentwicklung passt.",
        priority: "low",
        actionHref: "/progress",
      });
    }
    if (
      weeklyReport.avgProteinG > 0 &&
      weeklyReport.workouts >= 3 &&
      weeklyReport.weightChangeKg != null &&
      weeklyReport.weightChangeKg > 0.2 &&
      sleepStats?.lowNightsLast7 &&
      sleepStats.lowNightsLast7 >= 2
    ) {
      tips.unshift({
        type: "combined",
        message:
          "Schlaf war diese Woche knapp, trotzdem gutes Training und Gewichtstrend – achte auf Regeneration.",
        priority: "high",
        actionHref: "/coach",
      });
    }
  }

  if (challengeNearComplete) {
    tips.push({
      type: "challenge",
      message: challengeNearComplete,
      priority: "medium",
      actionHref: "/erfolge",
    });
  }

  // Heart rate / recovery readiness — from recovery snapshot when available
  if (recovery) {
    const avgRec =
      recovery.muscles.reduce((s, m) => s + m.recoveryPercent, 0) /
      Math.max(1, recovery.muscles.length);
    if (avgRec < 55) {
      tips.unshift({
        type: "recovery",
        message: `Durchschnittliche Muskel-Erholung ${Math.round(avgRec)}% — heute eher Mobility oder Pause.`,
        priority: "high",
        actionHref: "/gesundheit",
      });
    }
  }

  // Plateau detection (weight stuck + consistent training)
  if (
    weeklyReport?.workouts != null &&
    weeklyReport.workouts >= 3 &&
    weeklyReport.weightChangeKg != null &&
    Math.abs(weeklyReport.weightChangeKg) < 0.15 &&
    profile?.nutritionGoal === "FAT_LOSS"
  ) {
    tips.unshift({
      type: "plateau",
      message:
        "Plateau erkannt: Gewicht stagniert trotz Training. Prüfe Kaloriendefizit (+200 kcal check) oder erhöhe NEAT (Schritte).",
      priority: "high",
      actionHref: "/nutrition",
    });
  }

  // Auto goal nudge
  if (
    nutrition &&
    nutrition.targets.calories > 0 &&
    nutrition.consumed.calories > nutrition.targets.calories * 1.15
  ) {
    tips.push({
      type: "goal-adjust",
      message:
        "Du liegst klar über dem Kalorienziel — für morgen 150–200 kcal weniger planen oder Abendspaziergang einbauen.",
      priority: "medium",
      actionHref: "/nutrition",
    });
  }

  // Motivation
  if ((trainingStreak?.currentDays ?? 0) === 0 && tips.every((t) => t.type !== "motivation")) {
    tips.push({
      type: "motivation",
      message: "Kleiner Start zählt: 20 Minuten Training oder 2.000 Schritte — Momentum schlägt Perfektion.",
      priority: "low",
      actionHref: "/workouts/quick",
    });
  }

  const summary =
    tips.find((t) => t.priority === "high")?.message ??
    tips[0]?.message ??
    "Dein KI-Coach analysiert Ernährung, Training und Aktivitäten – starte mit dem Tracken.";

  const weeklyReportText = weeklyReport
    ? `Diese Woche: ${weeklyReport.workouts} Workouts, ⌀ ${Math.round(weeklyReport.avgProteinG)} g Protein` +
      (weeklyReport.weightChangeKg != null
        ? `, Gewicht ${weeklyReport.weightChangeKg > 0 ? "+" : ""}${weeklyReport.weightChangeKg.toFixed(1)} kg`
        : "") +
      (weeklyReport.avgSleepHours != null
        ? `, ⌀ Schlaf ${weeklyReport.avgSleepHours.toFixed(1)} h`
        : "") +
      (weeklyReport.goalReached ? " — Wochenziel erreicht ✓" : ".")
    : undefined;

  const trainingDoneToday =
    lastSession?.completedAt != null &&
    startOfDay(lastSession.completedAt).getTime() === startOfDay(new Date()).getTime();

  const recoveryPct =
    recovery?.muscles?.length
      ? Math.round(
          recovery.muscles.reduce((s, m) => s + m.recoveryPercent, 0) /
            recovery.muscles.length
        )
      : null;

  const status = {
    trainingDoneToday,
    trainingLabel: trainingDoneToday
      ? "✓ erledigt"
      : daysSinceWorkout == null
        ? "Noch kein Training getrackt"
        : daysSinceWorkout === 0
          ? "✓ erledigt"
          : `Vor ${daysSinceWorkout} Tag${daysSinceWorkout === 1 ? "" : "en"}`,
    calories: nutrition
      ? {
          consumed: Math.round(nutrition.consumed.calories),
          target: Math.round(nutrition.targets.calories),
        }
      : null,
    protein: nutrition
      ? {
          consumed: Math.round(nutrition.consumed.proteinG),
          target: Math.round(nutrition.targets.proteinG),
        }
      : null,
    steps: health?.today?.steps ?? null,
    sleepHours: sleepStats?.avgHours ?? null,
    recoveryPct,
    goal: profile?.trainingGoal ?? profile?.nutritionGoal ?? null,
  };

  const recommendations = tips
    .filter((t) => t.priority === "high" || t.priority === "medium")
    .slice(0, 5)
    .map((t) => t.message);

  return {
    summary,
    tips: tips.slice(0, 8),
    weeklyReportText,
    status,
    recommendations,
  };
}

import { getSleepWeekStats } from "@/lib/sleep-service";
import { buildWeeklyReport } from "@/lib/weekly-report";
import { loadMuscleRecovery } from "@/lib/recovery-service";

export async function buildCoachInsights(userId: string): Promise<CoachInsightsResult> {
  const today = startOfDay(new Date());
  const [nutrition, profile, trainingStreak, lastSession, activityWeek, health, recovery, weeklyReport, sleepStats, lastPr] =
    await Promise.all([
      loadNutritionDashboard(userId, today).catch(() => null),
      prisma.profile.findUnique({
        where: { userId },
        select: { trainingGoal: true, nutritionGoal: true, weightKg: true },
      }),
      prisma.trainingStreak.findUnique({
        where: { userId },
        select: { currentDays: true },
      }),
      prisma.workoutSession.findFirst({
        where: { userId, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true, name: true },
      }),
      getActivityWeekSummary(userId).catch(() => ({
        count: 0,
        totalDurationSec: 0,
        totalDistanceM: 0,
        totalCalories: 0,
      })),
      loadHealthDashboard(userId).catch(() => null),
      loadMuscleRecovery(userId).catch(() => null),
      buildWeeklyReport(userId).catch(() => null),
      getSleepWeekStats(userId).catch(() => null),
      prisma.personalRecord
        .findFirst({
          where: { userId },
          orderBy: { achievedAt: "desc" },
          include: { exercise: true },
        })
        .catch(() => null),
    ]);

  const recentPr = lastPr
    ? {
        exerciseName: lastPr.exercise.name,
        value: lastPr.weightKg ?? lastPr.value,
      }
    : null;

  return buildCoachInsightsFromContext({
    nutrition,
    health,
    activityWeek,
    profile,
    trainingStreak,
    lastSession,
    recovery: recovery ?? null,
    weeklyReport: weeklyReport
      ? {
          workouts: weeklyReport.workouts,
          avgProteinG: weeklyReport.avgProteinG,
          weightChangeKg: weeklyReport.weightChangeKg,
          avgSleepHours: weeklyReport.avgSleepHours,
          goalReached: weeklyReport.goalReached,
        }
      : null,
    sleepStats,
    recentPr,
  });
}
