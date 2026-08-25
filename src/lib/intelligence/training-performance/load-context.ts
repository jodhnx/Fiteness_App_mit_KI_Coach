import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";
import { loadNextWorkoutForUser } from "@/lib/plan-next-day";
import type {
  CompletedSetRow,
  PlanExerciseRow,
} from "@/lib/intelligence/training-performance/types";

export type TrainingPerformanceLoadResult = {
  workoutLabel: string | null;
  exerciseCount: number;
  planExercises: PlanExerciseRow[];
  sessions: { completedAt: Date | null; sets: CompletedSetRow[] }[];
  prsByExercise: Map<string, { weightKg: number; achievedAt: Date }>;
  recoveryScore: number | null;
  trainingReadiness: number | null;
};

const MAX_EXERCISES = 8;
const MAX_SESSIONS = 6;

export async function loadTrainingPerformanceContext(
  userId: string
): Promise<TrainingPerformanceLoadResult> {
  const today = startOfDay(new Date());
  const [nextWorkout, healthMetric] = await Promise.all([
    loadNextWorkoutForUser(userId).catch(() => null),
    prisma.dailyHealthMetric
      .findFirst({
        where: { userId, date: today },
        select: { recoveryScore: true, trainingReadiness: true },
      })
      .catch(() => null),
  ]);

  if (!nextWorkout?.dayId) {
    return {
      workoutLabel: null,
      exerciseCount: 0,
      planExercises: [],
      sessions: [],
      prsByExercise: new Map(),
      recoveryScore: healthMetric?.recoveryScore ?? null,
      trainingReadiness: healthMetric?.trainingReadiness ?? null,
    };
  }

  const planExercises = await prisma.workoutExercise.findMany({
    where: { workoutDayId: nextWorkout.dayId },
    orderBy: { orderIndex: "asc" },
    take: MAX_EXERCISES,
    select: {
      exerciseLibraryId: true,
      targetSets: true,
      targetReps: true,
      setTargets: true,
      exercise: { select: { name: true } },
    },
  });

  const exerciseIds = planExercises.map((e) => e.exerciseLibraryId);
  const workoutLabel = `${nextWorkout.planName} — ${nextWorkout.dayName}`;

  if (!exerciseIds.length) {
    return {
      workoutLabel,
      exerciseCount: 0,
      planExercises: [],
      sessions: [],
      prsByExercise: new Map(),
      recoveryScore: healthMetric?.recoveryScore ?? null,
      trainingReadiness: healthMetric?.trainingReadiness ?? null,
    };
  }

  const [sessions, prs] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: MAX_SESSIONS,
      select: {
        completedAt: true,
        sets: {
          where: {
            completed: true,
            exerciseLibraryId: { in: exerciseIds },
          },
          select: {
            exerciseLibraryId: true,
            exerciseName: true,
            reps: true,
            weightKg: true,
            setNumber: true,
            completed: true,
          },
        },
      },
    }),
    prisma.personalRecord.findMany({
      where: {
        userId,
        exerciseLibraryId: { in: exerciseIds },
        recordType: "MAX_WEIGHT",
      },
      select: {
        exerciseLibraryId: true,
        weightKg: true,
        value: true,
        achievedAt: true,
      },
    }),
  ]);

  const prsByExercise = new Map<string, { weightKg: number; achievedAt: Date }>();
  for (const pr of prs) {
    const kg = pr.weightKg ?? pr.value;
    if (kg <= 0) continue;
    const existing = prsByExercise.get(pr.exerciseLibraryId);
    if (!existing || pr.achievedAt > existing.achievedAt) {
      prsByExercise.set(pr.exerciseLibraryId, {
        weightKg: kg,
        achievedAt: pr.achievedAt,
      });
    }
  }

  return {
    workoutLabel,
    exerciseCount: planExercises.length,
    planExercises: planExercises.map((e) => ({
      exerciseLibraryId: e.exerciseLibraryId,
      exerciseName: e.exercise.name,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      setTargets: e.setTargets,
    })),
    sessions,
    prsByExercise,
    recoveryScore: healthMetric?.recoveryScore ?? null,
    trainingReadiness: healthMetric?.trainingReadiness ?? null,
  };
}
