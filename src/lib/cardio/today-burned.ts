/**
 * Today's exercise calories for nutrition budget (no BMR, no double-count).
 * Sources: EnduranceActivity (unique by externalId) + completed WorkoutSession.
 */

import { prisma } from "@/lib/prisma";
import { endOfDay, startOfDay } from "date-fns";

export type TodayExerciseBurn = {
  /** Total exercise kcal to add back to remaining */
  calories: number;
  enduranceKcal: number;
  workoutKcal: number;
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
    estimated: false,
    activities: [],
  };

  try {
    const [endurance, workouts] = await Promise.all([
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
    ]);

    // Dedup: unique constraint already on (userId, sourceProvider, externalId).
    // Do not add DailyHealthMetric here — that often includes the same workouts.
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

    // Strength sessions: only if they have calories and aren't already mirrored
    // as endurance (same day external imports create EnduranceActivity).
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
    const all = [...activities, ...workoutActs];
    const calories = enduranceKcal + workoutKcal;
    const estimated = all.some((a) => a.estimated) && all.every((a) => a.estimated || a.source === "MANUAL");

    return {
      calories,
      enduranceKcal,
      workoutKcal,
      estimated: calories > 0 ? estimated || activities.some((a) => a.estimated) : false,
      activities: all,
    };
  } catch (e) {
    console.error("[today-exercise-burn]", e);
    return empty;
  }
}
