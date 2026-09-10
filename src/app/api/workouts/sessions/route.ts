import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sessionCompletedVolume } from "@/lib/workout-metrics";
import { parsePlanSetTargets, DEFAULT_SET_COUNT } from "@/lib/plan-exercise-sets";
import { recordExerciseUsage } from "@/lib/workout-plans";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

const startSchema = z.object({
  workoutPlanId: z.string().optional(),
  workoutDayId: z.string().optional(),
  name: z.string().min(1),
  duplicateSessionId: z.string().optional(),
  exercises: z
    .array(
      z.object({
        exerciseLibraryId: z.string(),
        exerciseName: z.string(),
      })
    )
    .optional(),
});

type InitialSet = {
  exerciseLibraryId?: string;
  exerciseName: string;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  rpe?: number;
  restSeconds?: number;
  durationSec?: number;
  completed?: boolean;
  notes?: string;
};

const resumeInclude = {
  sets: { orderBy: [{ exerciseName: "asc" as const }, { setNumber: "asc" as const }] },
};

const activeSelect = {
  id: true,
  name: true,
  startedAt: true,
  status: true,
  workoutPlanId: true,
  workoutDayId: true,
};

async function lastCompletedSetsByExercise(
  userId: string,
  exerciseIds: string[],
  takePerExercise: number
) {
  const map = new Map<string, { reps: number | null; weightKg: number | null }[]>();
  if (exerciseIds.length === 0) return map;

  const rows = await prisma.workoutSet.findMany({
    where: {
      exerciseLibraryId: { in: exerciseIds },
      completed: true,
      session: { userId, status: "COMPLETED" },
    },
    orderBy: [{ session: { completedAt: "desc" } }, { setNumber: "asc" }],
    take: Math.min(800, exerciseIds.length * Math.max(takePerExercise, 6) * 4),
    select: {
      exerciseLibraryId: true,
      workoutSessionId: true,
      setNumber: true,
      reps: true,
      weightKg: true,
    },
  });

  const sessionOf = new Map<string, string>();
  for (const row of rows) {
    const eid = row.exerciseLibraryId;
    if (!eid) continue;
    if (!sessionOf.has(eid)) sessionOf.set(eid, row.workoutSessionId);
    if (row.workoutSessionId !== sessionOf.get(eid)) continue;
    const list = map.get(eid) ?? [];
    if (list.length >= takePerExercise) continue;
    list.push({ reps: row.reps, weightKg: row.weightKg });
    map.set(eid, list);
  }
  return map;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const activeOnly = req.nextUrl.searchParams.get("active") === "1";

    if (activeOnly) {
      const active = await prisma.workoutSession.findFirst({
        where: { userId: session.user.id, status: "IN_PROGRESS" },
        select: activeSelect,
      });
      return jsonOk({ session: active });
    }

    const rawLimit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
    const take = Number.isFinite(rawLimit)
      ? Math.min(100, Math.max(1, Math.floor(rawLimit)))
      : 20;
    const rawOffset = Number(req.nextUrl.searchParams.get("offset") ?? 0);
    const skip = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;

    const sessions = await prisma.workoutSession.findMany({
      where: { userId: session.user.id, status: "COMPLETED" },
      select: {
        id: true,
        name: true,
        startedAt: true,
        completedAt: true,
        durationSec: true,
        caloriesBurned: true,
        sets: {
          where: { completed: true },
          select: { reps: true, weightKg: true },
        },
      },
      orderBy: { completedAt: "desc" },
      take,
      skip,
    });

    return jsonOk({
      sessions: sessions.map((s) => ({
        id: s.id,
        name: s.name,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        durationSec: s.durationSec,
        caloriesBurned: s.caloriesBurned,
        setCount: s.sets.length,
        volumeKg: Math.round(sessionCompletedVolume(s.sets)),
        _count: { sets: s.sets.length },
      })),
      hasMore: sessions.length === take,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();

    if (body.action === "start") {
      const parsed = startSchema.safeParse(body);
      if (!parsed.success) return jsonError("Ungültige Eingabe");

      const existing = await prisma.workoutSession.findFirst({
        where: { userId: session.user.id, status: "IN_PROGRESS" },
        include: resumeInclude,
      });
      if (existing) {
        return jsonOk({ session: existing, resumed: true });
      }

      const dayId = parsed.data.workoutDayId;
      const planId = parsed.data.workoutPlanId;

      if (dayId) {
        const ownedDay = await prisma.workoutDay.findFirst({
          where: { id: dayId, plan: { userId: session.user.id } },
          select: { workoutPlanId: true },
        });
        if (!ownedDay) return jsonError("Trainingstag nicht gefunden", 404);
        if (planId && planId !== ownedDay.workoutPlanId) {
          return jsonError("Trainingstag gehört nicht zum Plan", 404);
        }
      }

      if (planId) {
        const ownedPlan = await prisma.workoutPlan.findFirst({
          where: { id: planId, userId: session.user.id },
          select: { id: true },
        });
        if (!ownedPlan) return jsonError("Trainingsplan nicht gefunden", 404);
      }

      let initialSets: InitialSet[] = [];

      if (parsed.data.duplicateSessionId) {
        const prev = await prisma.workoutSession.findFirst({
          where: { id: parsed.data.duplicateSessionId, userId: session.user.id },
          include: { sets: true },
        });
        if (prev) {
          initialSets = prev.sets.map((s) => ({
            exerciseLibraryId: s.exerciseLibraryId ?? undefined,
            exerciseName: s.exerciseName,
            setNumber: s.setNumber,
            reps: s.reps ?? 0,
            weightKg: s.weightKg ?? 0,
            rpe: s.rpe ?? undefined,
            restSeconds: s.restSeconds ?? 90,
            completed: false,
          }));
        }
      } else if (parsed.data.exercises?.length) {
        const exerciseIds = parsed.data.exercises.map((e) => e.exerciseLibraryId);
        void recordExerciseUsage(session.user.id, exerciseIds);
        const lastByEx = await lastCompletedSetsByExercise(
          session.user.id,
          exerciseIds,
          DEFAULT_SET_COUNT
        );

        for (const ex of parsed.data.exercises) {
          const lastSessionSets = lastByEx.get(ex.exerciseLibraryId) ?? [];
          for (let i = 0; i < DEFAULT_SET_COUNT; i++) {
            const ls = lastSessionSets[i];
            initialSets.push({
              exerciseLibraryId: ex.exerciseLibraryId,
              exerciseName: ex.exerciseName,
              setNumber: i + 1,
              reps: ls?.reps ?? undefined,
              weightKg: ls?.weightKg ?? undefined,
              restSeconds: 90,
              completed: false,
            });
          }
        }
      } else if (dayId) {
        const day = await prisma.workoutDay.findFirst({
          where: {
            id: dayId,
            plan: { userId: session.user.id },
          },
          include: { exercises: { include: { exercise: true }, orderBy: { orderIndex: "asc" } } },
        });
        if (day) {
          const exerciseIds = day.exercises.map((ex) => ex.exerciseLibraryId);
          const maxSets = Math.max(
            DEFAULT_SET_COUNT,
            ...day.exercises.map((ex) =>
              Math.max(parsePlanSetTargets(ex.setTargets, ex.targetSets, ex.targetReps).length, ex.targetSets, 1)
            )
          );
          const lastByEx = await lastCompletedSetsByExercise(
            session.user.id,
            exerciseIds,
            maxSets
          );

          for (const ex of day.exercises) {
            const planSets = parsePlanSetTargets(
              ex.setTargets,
              ex.targetSets,
              ex.targetReps
            );
            const setCount = Math.max(planSets.length, ex.targetSets, 1);
            const lastSessionSets = lastByEx.get(ex.exerciseLibraryId) ?? [];

            for (let i = 0; i < setCount; i++) {
              const ls = lastSessionSets[i];
              const planRow = planSets[i];
              initialSets.push({
                exerciseLibraryId: ex.exerciseLibraryId,
                exerciseName: ex.exercise.name,
                setNumber: i + 1,
                reps: ls?.reps ?? planRow?.reps ?? undefined,
                weightKg: ls?.weightKg ?? planRow?.weightKg ?? undefined,
                restSeconds: ex.restSeconds,
                completed: false,
              });
            }
          }
        }
      }

      const workoutSession = await prisma.workoutSession.create({
        data: {
          userId: session.user.id,
          workoutPlanId: planId,
          workoutDayId: dayId,
          name: parsed.data.name,
          status: "IN_PROGRESS",
          sets: initialSets.length
            ? { create: initialSets.map((s) => ({ ...s, completed: false })) }
            : undefined,
        },
        include: resumeInclude,
      });

      return jsonOk({ session: workoutSession }, 201);
    }

    return jsonError("Unbekannte Aktion", 400);
  } catch (e) {
    console.error("SESSION START ERROR:", e);
    return handleApiError(e);
  }
}
