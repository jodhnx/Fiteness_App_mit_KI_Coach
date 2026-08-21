/**
 * Today's exercise calories for nutrition budget + Home display.
 * Sources (deduped): steps + EnduranceActivity + strength sessions.
 * Wearable imports use unique (userId, sourceProvider, externalId).
 * Does NOT include BMR. Does NOT double-count Health metric vs endurance.
 */

import { prisma } from "@/lib/prisma";
import { endOfDay, startOfDay } from "date-fns";
import { estimateStepCalories } from "@/lib/activity-health";

export type TodayExerciseBurn = {
  /** Total exercise kcal to add back to remaining / show on Home */
  calories: number;
  enduranceKcal: number;
  workoutKcal: number;
  stepKcal: number;
  estimated: boolean;
  activities: {
    id: string;
    type: string;
    label: string;
    durationSec: number;
    calories: number;
    estimated: boolean;
    source: string;
  }[];
};

function notesEstimated(notes?: string | null) {
  return Boolean(notes?.includes("[estimated:1]"));
}

function labelFromNotes(type: string, notes?: string | null) {
  const m = notes?.match(/^\[cardio:([^\]]+)\]/);
  if (m?.[1]) return m[1];
  return type;
}

export async function getTodayExerciseBurn(
  userId: string,
  day: Date = new Date()
): Promise<TodayExerciseBurn> {
  const from = startOfDay(day);
  const to = endOfDay(day);

  const empty: TodayExerciseBurn = {
    calories: 0,
    enduranceKcal: 0,
    workoutKcal: 0,
    stepKcal: 0,
    estimated: false,
    activities: [],
  };

  try {
    const [endurance, workouts, metric, profile] = await Promise.all([
      prisma.enduranceActivity.findMany({
        where: { userId, startedAt: { gte: from, lte: to } },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          type: true,
          durationSec: true,
          caloriesBurned: true,
          notes: true,
          sourceProvider: true,
          externalId: true,
        },
      }),
      prisma.workoutSession.findMany({
        where: {
          userId,
          completedAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          name: true,
          caloriesBurned: true,
          durationSec: true,
        },
      }),
      prisma.dailyHealthMetric
        .findUnique({
          where: { userId_date: { userId, date: from } },
          select: { steps: true, caloriesBurned: true },
        })
        .catch(() => null),
      prisma.profile
        .findUnique({
          where: { userId },
          select: { weightKg: true },
        })
        .catch(() => null),
    ]);

    const steps = metric?.steps ?? 0;
    const stepKcal = estimateStepCalories(steps, profile?.weightKg ?? null);

    // Dedup: unique constraint on (userId, sourceProvider, externalId).
    const activities = endurance.map((a) => {
      const kcal = Math.max(0, a.caloriesBurned ?? 0);
      const estimated = !a.sourceProvider || notesEstimated(a.notes);
      return {
        id: a.id,
        type: a.type,
        label: labelFromNotes(a.type, a.notes),
        durationSec: a.durationSec,
        calories: kcal,
        estimated,
        source: a.sourceProvider ?? "MANUAL",
      };
    });

    const enduranceKcal = activities.reduce((s, a) => s + a.calories, 0);

    const workoutActs = workouts
      .filter((w) => (w.caloriesBurned ?? 0) > 0)
      .map((w) => ({
        id: w.id,
        type: "STRENGTH",
        label: w.name || "Krafttraining",
        durationSec: w.durationSec ?? 0,
        calories: Math.max(0, w.caloriesBurned ?? 0),
        estimated: true,
        source: "WORKOUT",
      }));

    const workoutKcal = workoutActs.reduce((s, a) => s + a.calories, 0);

    // Residual from health metric only when it exceeds steps+logged activities
    // (covers wearable active energy not mirrored as EnduranceActivity).
    const metricTotal = Math.max(0, metric?.caloriesBurned ?? 0);
    const loggedPlusSteps = stepKcal + enduranceKcal + workoutKcal;
    const residualHealth = Math.max(0, metricTotal - loggedPlusSteps);

    const all = [...activities, ...workoutActs];
    if (stepKcal > 0) {
      all.push({
        id: "steps-today",
        type: "STEPS",
        label: "Schritte",
        durationSec: 0,
        calories: stepKcal,
        estimated: true,
        source: "STEPS",
      });
    }
    if (residualHealth > 0) {
      all.push({
        id: "health-residual",
        type: "HEALTH",
        label: "Aktivität (Wearable)",
        durationSec: 0,
        calories: residualHealth,
        estimated: false,
        source: "HEALTH_METRIC",
      });
    }

    const calories = loggedPlusSteps + residualHealth;
    const hasMeasured = all.some(
      (a) => !a.estimated && a.source !== "MANUAL" && a.source !== "STEPS"
    );

    return {
      calories,
      enduranceKcal,
      workoutKcal,
      stepKcal,
      estimated: calories > 0 ? !hasMeasured : false,
      activities: all,
    };
  } catch (e) {
    console.error("[today-exercise-burn]", e);
    return empty;
  }
}
