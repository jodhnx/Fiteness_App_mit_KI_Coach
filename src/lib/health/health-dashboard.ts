import { prisma } from "@/lib/prisma";
import { startOfDay, subDays } from "date-fns";
import { loadHealthDashboard } from "@/lib/activity-health";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { calculateBMI } from "@/lib/profile-calculations";

export type ExtendedHealthDashboard = {
  today: {
    steps: number;
    stepGoal: number;
    sleepHours: number | null;
    sleepQuality: string | null;
    restingHeartRate: number | null;
    avgHeartRate: number | null;
    maxHeartRate: number | null;
    caloriesBurned: number;
    activeCalories: number | null;
    activeMinutes: number;
    activeMinuteGoal: number;
    distanceM: number;
    floorsClimbed: number | null;
    bloodOxygen: number | null;
    recoveryScore: number | null;
    trainingReadiness: number | null;
    waterMl: number;
    waterGoalMl: number;
    weightKg: number | null;
    bmi: number | null;
  };
  connections: {
    provider: string;
    name: string;
    isActive: boolean;
    lastSyncAt: string | null;
    lastSyncError: string | null;
  }[];
  lastSyncAt: string | null;
  rings: {
    move: { value: number; goal: number; pct: number };
    exercise: { value: number; goal: number; pct: number };
    steps: { value: number; goal: number; pct: number };
  };
  sleepLastNight: {
    hours: number | null;
    deepHours: number | null;
    remHours: number | null;
    lightHours: number | null;
    bedtime: string | null;
    wakeTime: string | null;
    quality: string | null;
  };
  heartRate: {
    resting: number | null;
    avg: number | null;
    max: number | null;
  };
  regeneration: {
    score: number | null;
    label: string;
    trainingReadiness: number | null;
    readinessLabel: string;
  };
};

function readinessLabel(score: number | null): string {
  if (score == null) return "—";
  if (score >= 80) return "Hoch";
  if (score >= 55) return "Mittel";
  return "Niedrig";
}

function recoveryLabel(score: number | null): string {
  if (score == null) return "—";
  if (score >= 70) return "Gut erholt";
  if (score >= 40) return "Teilweise erholt";
  return "Erholung empfohlen";
}

function computeRecoveryScore(metric: {
  sleepHours: number | null;
  restingHeartRate: number | null;
  sleepQuality: string | null;
} | null): number | null {
  if (!metric) return null;
  let score = 50;
  if (metric.sleepHours != null) {
    if (metric.sleepHours >= 7.5) score += 25;
    else if (metric.sleepHours >= 6) score += 10;
    else score -= 15;
  }
  if (metric.restingHeartRate != null) {
    if (metric.restingHeartRate <= 60) score += 15;
    else if (metric.restingHeartRate <= 70) score += 5;
    else if (metric.restingHeartRate > 80) score -= 10;
  }
  if (metric.sleepQuality === "good" || metric.sleepQuality === "excellent") score += 10;
  return Math.max(0, Math.min(100, score));
}

function computeTrainingReadiness(
  recoveryScore: number | null,
  sleepHours: number | null
): number | null {
  if (recoveryScore == null && sleepHours == null) return null;
  let score = recoveryScore ?? 50;
  if (sleepHours != null && sleepHours < 5) score = Math.min(score, 35);
  if (sleepHours != null && sleepHours >= 8) score = Math.min(100, score + 10);
  return Math.max(0, Math.min(100, score));
}

export async function loadExtendedHealthDashboard(
  userId: string
): Promise<ExtendedHealthDashboard> {
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);

  const [base, nutrition, profile, connections, todayMetric, sleepMetric] =
    await Promise.all([
      loadHealthDashboard(userId).catch(() => null),
      loadNutritionDashboard(userId, today).catch(() => null),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.wearableConnection.findMany({ where: { userId } }).catch(() => []),
      prisma.dailyHealthMetric
        .findUnique({ where: { userId_date: { userId, date: today } } })
        .catch(() => null),
      prisma.dailyHealthMetric
        .findUnique({ where: { userId_date: { userId, date: yesterday } } })
        .catch(() => null),
    ]);

  const sleepSource = sleepMetric?.sleepHours != null ? sleepMetric : todayMetric;
  const recoveryScore =
    todayMetric?.recoveryScore ??
    computeRecoveryScore({
      sleepHours: sleepSource?.sleepHours ?? null,
      restingHeartRate: todayMetric?.restingHeartRate ?? null,
      sleepQuality: sleepSource?.sleepQuality ?? null,
    });

  const trainingReadiness =
    todayMetric?.trainingReadiness ??
    computeTrainingReadiness(recoveryScore, sleepSource?.sleepHours ?? null);

  const weightKg = profile?.weightKg ?? null;
  const bmi =
    profile?.bmi ??
    (weightKg && profile?.heightCm
      ? calculateBMI(weightKg, profile.heightCm)
      : null);

  const lastSync = connections
    .filter((c) => c.lastSyncAt)
    .sort((a, b) => (b.lastSyncAt?.getTime() ?? 0) - (a.lastSyncAt?.getTime() ?? 0))[0]
    ?.lastSyncAt;

  const { getProviderMeta } = await import("@/lib/health/providers/registry");

  return {
    today: {
      steps: base?.today.steps ?? todayMetric?.steps ?? 0,
      stepGoal: base?.today.stepGoal ?? 10000,
      sleepHours: sleepSource?.sleepHours ?? null,
      sleepQuality: sleepSource?.sleepQuality ?? null,
      restingHeartRate: todayMetric?.restingHeartRate ?? null,
      avgHeartRate: todayMetric?.avgHeartRate ?? null,
      maxHeartRate: todayMetric?.maxHeartRate ?? null,
      caloriesBurned: base?.today.caloriesBurned ?? todayMetric?.caloriesBurned ?? 0,
      activeCalories: todayMetric?.activeCalories ?? null,
      activeMinutes: base?.today.activeMinutes ?? todayMetric?.activeMinutes ?? 0,
      activeMinuteGoal: base?.goals.activeMinuteGoal ?? 30,
      distanceM: base?.today.distanceM ?? todayMetric?.distanceM ?? 0,
      floorsClimbed: todayMetric?.floorsClimbed ?? null,
      bloodOxygen: todayMetric?.bloodOxygen ?? null,
      recoveryScore,
      trainingReadiness,
      waterMl: nutrition?.water.consumedMl ?? 0,
      waterGoalMl: nutrition?.water.targetMl ?? 2500,
      weightKg,
      bmi,
    },
    connections: connections.map((c) => ({
      provider: c.provider,
      name: getProviderMeta(c.provider)?.name ?? c.provider,
      isActive: c.isActive,
      lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
      lastSyncError: c.lastSyncError ?? null,
    })),
    lastSyncAt: lastSync?.toISOString() ?? null,
    rings: base?.rings ?? {
      move: { value: 0, goal: 500, pct: 0 },
      exercise: { value: 0, goal: 30, pct: 0 },
      steps: { value: 0, goal: 10000, pct: 0 },
    },
    sleepLastNight: {
      hours: sleepSource?.sleepHours ?? null,
      deepHours: sleepSource?.sleepDeepHours ?? null,
      remHours: sleepSource?.sleepRemHours ?? null,
      lightHours: sleepSource?.sleepLightHours ?? null,
      bedtime: sleepSource?.sleepBedtime?.toISOString() ?? null,
      wakeTime: sleepSource?.sleepWakeTime?.toISOString() ?? null,
      quality: sleepSource?.sleepQuality ?? null,
    },
    heartRate: {
      resting: todayMetric?.restingHeartRate ?? null,
      avg: todayMetric?.avgHeartRate ?? null,
      max: todayMetric?.maxHeartRate ?? null,
    },
    regeneration: {
      score: recoveryScore,
      label: recoveryLabel(recoveryScore),
      trainingReadiness,
      readinessLabel: readinessLabel(trainingReadiness),
    },
  };
}

export function buildCoachHealthInsights(dashboard: ExtendedHealthDashboard): string[] {
  const tips: string[] = [];
  const { today, sleepLastNight, regeneration } = dashboard;

  if (sleepLastNight.hours != null && sleepLastNight.hours < 6) {
    tips.push(
      `Du hast nur ${sleepLastNight.hours.toFixed(1)} Stunden geschlafen. Heute wäre ein leichteres Training sinnvoll.`
    );
  }

  if (today.steps >= today.stepGoal) {
    tips.push("Du hast dein Schrittziel bereits erreicht.");
  } else if (today.stepGoal > 0) {
    const remaining = today.stepGoal - today.steps;
    tips.push(`Noch ${remaining.toLocaleString("de-DE")} Schritte bis zum Tagesziel.`);
  }

  if (today.restingHeartRate != null && today.restingHeartRate > 75) {
    tips.push(
      "Dein Ruhepuls ist heute erhöht. Plane gegebenenfalls mehr Erholung ein."
    );
  }

  if (regeneration.trainingReadiness != null && regeneration.trainingReadiness >= 75) {
    tips.push("Deine Regeneration ist hoch – ein intensives Training ist möglich.");
  } else if (
    regeneration.trainingReadiness != null &&
    regeneration.trainingReadiness < 45
  ) {
    tips.push("Deine Trainingsbereitschaft ist niedrig – leichte Aktivität oder Ruhe empfohlen.");
  }

  if (today.bloodOxygen != null && today.bloodOxygen < 94) {
    tips.push("SpO₂ ist unter dem üblichen Bereich – bei Beschwerden ärztlichen Rat einholen.");
  }

  return tips;
}
