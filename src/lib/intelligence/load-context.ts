import { prisma } from "@/lib/prisma";
import { startOfDay, subDays } from "date-fns";
import type { IntelligenceContext } from "@/lib/intelligence/context";

type SessionWithSets = {
  name: string | null;
  completedAt: Date | null;
  sets: {
    reps: number | null;
    weightKg: number | null;
    exerciseLibraryId: string | null;
    exercise?: { name: string } | null;
  }[];
};

function bestSetScore(reps: number | null, weightKg: number | null): number {
  const r = reps ?? 0;
  const w = weightKg ?? 0;
  return w * 1000 + r;
}

/** Compare last two completed sessions for same exercise improvements. */
export function detectSessionImprovement(
  latest: SessionWithSets | null,
  previous: SessionWithSets | null
): { exerciseName: string; detail: string } | null {
  if (!latest?.completedAt || !previous?.completedAt) return null;
  if (latest.completedAt <= previous.completedAt) return null;

  const prevBest = new Map<string, { score: number; weight: number; reps: number; name: string }>();
  for (const s of previous.sets) {
    if (!s.exerciseLibraryId) continue;
    const score = bestSetScore(s.reps, s.weightKg);
    const name = s.exercise?.name ?? "Übung";
    const cur = prevBest.get(s.exerciseLibraryId);
    if (!cur || score > cur.score) {
      prevBest.set(s.exerciseLibraryId, {
        score,
        weight: s.weightKg ?? 0,
        reps: s.reps ?? 0,
        name,
      });
    }
  }

  let bestImprovement: { exerciseName: string; detail: string; delta: number } | null =
    null;

  for (const s of latest.sets) {
    if (!s.exerciseLibraryId) continue;
    const prev = prevBest.get(s.exerciseLibraryId);
    if (!prev) continue;
    const score = bestSetScore(s.reps, s.weightKg);
    if (score <= prev.score) continue;

    const weight = s.weightKg ?? 0;
    const reps = s.reps ?? 0;
    const name = s.exercise?.name ?? prev.name;
    let detail = "";
    if (weight > prev.weight) {
      detail = `+${(weight - prev.weight).toFixed(1)} kg gegenüber dem letzten Training`;
    } else if (reps > prev.reps) {
      detail = `+${reps - prev.reps} Wdh. bei ${weight} kg`;
    } else {
      detail = "bessere Leistung als beim letzten Mal";
    }

    const delta = score - prev.score;
    if (!bestImprovement || delta > bestImprovement.delta) {
      bestImprovement = { exerciseName: name, detail, delta };
    }
  }

  return bestImprovement
    ? { exerciseName: bestImprovement.exerciseName, detail: bestImprovement.detail }
    : null;
}

export async function loadIntelligenceContext(
  userId: string,
  partial?: Partial<IntelligenceContext>
): Promise<IntelligenceContext> {
  const now = partial?.now ?? new Date();
  const today = startOfDay(now);

  const [
    nutrition,
    profile,
    trainingStreak,
    lastSessions,
    weightEntries,
    recentPr,
    healthMetric,
    weeklyWorkouts,
  ] = await Promise.all([
    partial?.nutrition !== undefined
      ? Promise.resolve(partial.nutrition)
      : import("@/lib/nutrition-service").then((m) =>
          m.loadNutritionDashboard(userId, today).catch(() => null)
        ),
    prisma.profile
      .findUnique({
        where: { userId },
        select: {
          weightKg: true,
          targetWeightKg: true,
          nutritionGoal: true,
          workoutDaysPerWeek: true,
        },
      })
      .catch(() => null),
    prisma.trainingStreak
      .findUnique({ where: { userId }, select: { currentDays: true } })
      .catch(() => null),
    prisma.workoutSession
      .findMany({
        where: { userId, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 2,
        select: {
          name: true,
          completedAt: true,
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
    partial?.weightEntries
      ? Promise.resolve(partial.weightEntries)
      : prisma.progressEntry
          .findMany({
            where: {
              userId,
              weightKg: { not: null },
              date: { gte: subDays(today, 28) },
            },
            orderBy: { date: "asc" },
            select: { date: true, weightKg: true },
          })
          .then((rows) =>
            rows
              .filter((r) => r.weightKg != null)
              .map((r) => ({ date: r.date, weightKg: r.weightKg! }))
          )
          .catch(() => []),
    prisma.personalRecord
      .findFirst({
        where: { userId },
        orderBy: { achievedAt: "desc" },
        include: { exercise: { select: { name: true } } },
      })
      .catch(() => null),
    prisma.dailyHealthMetric
      .findFirst({
        where: { userId, date: today },
        select: { steps: true, sleepHours: true, recoveryScore: true },
      })
      .catch(() => null),
    prisma.workoutSession
      .count({
        where: {
          userId,
          status: "COMPLETED",
          completedAt: { gte: subDays(today, 7) },
        },
      })
      .catch(() => null),
  ]);

  const trainingSnap = partial?.trainingDoneToday !== undefined
    ? null
    : await import("@/lib/training-snapshot")
        .then((m) => m.loadTrainingSnapshot(userId))
        .catch(() => null);

  const last = lastSessions[0] ?? null;
  const prev = lastSessions[1] ?? null;
  const trainingDoneToday =
    partial?.trainingDoneToday ??
    (last?.completedAt != null &&
      startOfDay(last.completedAt).getTime() === today.getTime());

  const consumed = nutrition?.consumed;
  const targets = nutrition?.targets;
  const proteinRemaining =
    partial?.proteinRemaining ??
    (targets?.proteinG != null && consumed
      ? targets.proteinG - consumed.proteinG
      : 0);
  const caloriesRemaining =
    partial?.caloriesRemaining ??
    (targets?.calories != null && consumed
      ? targets.calories - consumed.calories
      : 0);

  return {
    now,
    nutrition: nutrition ?? null,
    proteinRemaining,
    caloriesRemaining,
    calorieTarget: partial?.calorieTarget ?? targets?.calories ?? 0,
    proteinTarget: partial?.proteinTarget ?? targets?.proteinG ?? 0,
    proteinConsumed: partial?.proteinConsumed ?? consumed?.proteinG ?? 0,
    caloriesConsumed: partial?.caloriesConsumed ?? consumed?.calories ?? 0,
    nutritionGoal:
      partial?.nutritionGoal ?? profile?.nutritionGoal ?? targets?.nutritionGoal ?? null,
    trainingDoneToday,
    trainingPlanned:
      partial?.trainingPlanned ??
      Boolean(trainingSnap?.nextWorkout?.dayId),
    activeSession:
      partial?.activeSession ?? Boolean(trainingSnap?.activeSession?.id),
    nextWorkoutLabel:
      partial?.nextWorkoutLabel ??
      (trainingSnap?.nextWorkout
        ? `${trainingSnap.nextWorkout.planName} — ${trainingSnap.nextWorkout.dayName}`
        : null),
    trainingStreakDays:
      partial?.trainingStreakDays ?? trainingStreak?.currentDays ?? 0,
    weightKg: partial?.weightKg ?? profile?.weightKg ?? null,
    targetWeightKg: partial?.targetWeightKg ?? profile?.targetWeightKg ?? null,
    weightEntries: partial?.weightEntries ?? weightEntries,
    recentPr: recentPr
      ? {
          exerciseName: recentPr.exercise.name,
          weightKg: recentPr.weightKg,
          value: recentPr.value,
          achievedAt: recentPr.achievedAt,
        }
      : null,
    sessionImprovement:
      partial?.sessionImprovement ??
      detectSessionImprovement(last, prev),
    steps: partial?.steps ?? healthMetric?.steps ?? null,
    stepGoal: partial?.stepGoal ?? 10_000,
    sleepHours: partial?.sleepHours ?? healthMetric?.sleepHours ?? null,
    recoveryScore:
      partial?.recoveryScore ?? healthMetric?.recoveryScore ?? null,
    workoutsThisWeek: partial?.workoutsThisWeek ?? weeklyWorkouts,
  };
}
