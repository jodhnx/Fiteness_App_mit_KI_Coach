import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { buildCompletedDayIds } from "@/lib/plan-day-status";

export type PlanDayRow = {
  id: string;
  name: string;
  dayOrder: number;
  exerciseCount: number;
};

export type NextWorkoutPayload = {
  planName: string;
  dayName: string;
  planId: string;
  dayId: string;
  dayNumber: number;
  exerciseCount: number;
  estimatedDurationMin: number;
};

/** First incomplete training day in plan order; wraps to day 1 when cycle is complete. */
export function pickNextOpenPlanDay(
  days: PlanDayRow[],
  completedDayIds: Set<string>
): PlanDayRow | null {
  const trainingDays = [...days]
    .sort((a, b) => a.dayOrder - b.dayOrder)
    .filter((d) => d.exerciseCount > 0);

  if (trainingDays.length === 0) return null;

  const next = trainingDays.find((d) => !completedDayIds.has(d.id));
  return next ?? trainingDays[0];
}

export function trainingDayNumber(days: PlanDayRow[], dayId: string): number {
  const trainingDays = [...days]
    .sort((a, b) => a.dayOrder - b.dayOrder)
    .filter((d) => d.exerciseCount > 0);
  const idx = trainingDays.findIndex((d) => d.id === dayId);
  return idx >= 0 ? idx + 1 : 1;
}

/** Resolve the next plan day for the user's active workout plan. */
export async function loadNextWorkoutForUser(
  userId: string
): Promise<NextWorkoutPayload | null> {
  const plan = await prisma.workoutPlan.findFirst({
    where: { userId, archivedAt: null, isActive: true },
    select: {
      id: true,
      name: true,
      days: {
        orderBy: { dayOrder: "asc" },
        select: {
          id: true,
          name: true,
          dayOrder: true,
          _count: { select: { exercises: true } },
        },
      },
    },
  });

  if (!plan) return null;

  const since = subDays(new Date(), 14);
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      workoutPlanId: plan.id,
      status: "COMPLETED",
      completedAt: { gte: since },
    },
    select: { workoutDayId: true, completedAt: true },
  });

  const completedIds = buildCompletedDayIds(sessions, 14);
  const rows: PlanDayRow[] = plan.days.map((d) => ({
    id: d.id,
    name: d.name,
    dayOrder: d.dayOrder,
    exerciseCount: d._count.exercises,
  }));

  const picked = pickNextOpenPlanDay(rows, completedIds);
  if (!picked) return null;

  const exerciseCount = picked.exerciseCount;
  return {
    planName: plan.name,
    dayName: picked.name,
    planId: plan.id,
    dayId: picked.id,
    dayNumber: trainingDayNumber(rows, picked.id),
    exerciseCount,
    estimatedDurationMin: Math.max(30, Math.min(120, exerciseCount * 8 + 10)),
  };
}
