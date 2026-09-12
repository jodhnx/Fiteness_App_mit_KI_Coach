import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { awardXPForAction } from "@/lib/gamification";
import { evaluateAndUnlockAchievements } from "@/lib/achievement-engine";
import { recordExerciseUsage, updateTrainingStreak } from "@/lib/workout-plans";
import {
  computePRUpdates,
  sessionDurationSec,
  setVolume,
  shouldApplyCompletionRewards,
} from "@/lib/workout-metrics";
import { analyzeWorkoutSession } from "@/lib/workout-session-analysis";
import { upsertMissingPersonalRecords } from "@/lib/pr-recalculate";
import { subDays } from "date-fns";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import type { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const setPatchSchema = z.object({
  setId: z.string().optional(),
  action: z.enum(["updateSet", "addSet", "deleteSet", "complete", "cancel"]),
  exerciseLibraryId: z.string().optional(),
  exerciseName: z.string().optional(),
  setNumber: z.number().int().positive().optional(),
  reps: z.number().optional(),
  weightKg: z.number().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
  restSeconds: z.number().optional(),
  completed: z.boolean().optional(),
  notes: z.string().optional(),
  name: z.string().optional(),
});

const sessionSetsInclude = {
  sets: {
    orderBy: [{ exerciseName: "asc" as const }, { setNumber: "asc" as const }],
    include: { exercise: { select: { muscleGroup: true } } },
  },
};

async function previousSetsByExercise(
  userId: string,
  sessionId: string,
  sets: { exerciseLibraryId: string | null; exerciseName: string }[]
) {
  const previousByExercise: Record<
    string,
    {
      id: string;
      exerciseLibraryId: string | null;
      exerciseName: string;
      setNumber: number;
      reps: number | null;
      weightKg: number | null;
      completed: boolean;
      restSeconds: number | null;
      rpe: number | null;
      notes: string | null;
      workoutSessionId: string;
    }[]
  > = {};

  const libraryIds = [
    ...new Set(
      sets.map((s) => s.exerciseLibraryId).filter((id): id is string => Boolean(id))
    ),
  ];
  const names = [
    ...new Set(sets.filter((s) => !s.exerciseLibraryId).map((s) => s.exerciseName)),
  ];

  const or: Prisma.WorkoutSetWhereInput[] = [];
  if (libraryIds.length) or.push({ exerciseLibraryId: { in: libraryIds } });
  if (names.length) or.push({ exerciseName: { in: names }, exerciseLibraryId: null });
  if (or.length === 0) return previousByExercise;

  const prev = await prisma.workoutSet.findMany({
    where: {
      OR: or,
      completed: true,
      session: {
        userId,
        status: "COMPLETED",
        id: { not: sessionId },
      },
    },
    orderBy: [{ session: { completedAt: "desc" } }, { setNumber: "asc" }],
    take: 400,
    select: {
      id: true,
      exerciseLibraryId: true,
      exerciseName: true,
      setNumber: true,
      reps: true,
      weightKg: true,
      completed: true,
      restSeconds: true,
      rpe: true,
      notes: true,
      workoutSessionId: true,
    },
  });

  const sessionOf = new Map<string, string>();
  for (const row of prev) {
    const key = row.exerciseLibraryId ?? row.exerciseName;
    if (!sessionOf.has(key)) sessionOf.set(key, row.workoutSessionId);
    if (row.workoutSessionId !== sessionOf.get(key)) continue;
    if ((row.weightKg ?? 0) <= 0 && (row.reps ?? 0) <= 0) continue;
    if (!previousByExercise[key]) previousByExercise[key] = [];
    if (previousByExercise[key]!.length >= 12) continue;
    previousByExercise[key]!.push(row);
  }

  return previousByExercise;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;
    const workoutSession = await prisma.workoutSession.findFirst({
      where: { id, userId: session.user.id },
      include: sessionSetsInclude,
    });
    if (!workoutSession) return jsonError("Session nicht gefunden", 404);

    const previousByExercise = await previousSetsByExercise(
      session.user.id,
      id,
      workoutSession.sets
    );

    return jsonOk({ session: workoutSession, previousByExercise });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;

    const owned = await prisma.workoutSession.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!owned) return jsonError("Session nicht gefunden", 404);

    await prisma.$transaction([
      prisma.workoutSet.deleteMany({ where: { workoutSessionId: id } }),
      prisma.workoutSession.deleteMany({
        where: { id, userId: session.user.id },
      }),
    ]);
    return jsonOk({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;
    const body = await req.json();

    const ws = await prisma.workoutSession.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!ws) return jsonError("Session nicht gefunden", 404);

    if (body.action === "editSession") {
      const updated = await prisma.workoutSession.update({
        where: { id },
        data: {
          name: body.name,
          notes: body.notes,
          completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
        },
      });
      return jsonOk({ session: updated });
    }

    if (body.action === "cancel") {
      if (ws.status === "COMPLETED") {
        return jsonError("Abgeschlossenes Training kann nicht verworfen werden", 409);
      }
      if (ws.status === "CANCELLED") {
        return jsonOk({ success: true, alreadyCancelled: true });
      }
      await prisma.workoutSession.update({
        where: { id },
        data: { status: "CANCELLED", completedAt: new Date() },
      });
      return jsonOk({ success: true });
    }

    if (body.action === "complete") {
      if (ws.status === "CANCELLED") {
        return jsonError("Abgebrochenes Training kann nicht abgeschlossen werden", 409);
      }

      if (!shouldApplyCompletionRewards(ws.status)) {
        const existing = await prisma.workoutSession.findFirst({
          where: { id, userId: session.user.id },
          include: sessionSetsInclude,
        });
        return jsonOk({
          session: existing,
          newPRs: [],
          analysis: null,
          unlocks: [],
          nextWorkout: null,
          alreadyCompleted: true,
        });
      }

      const full = await prisma.workoutSession.findFirst({
        where: { id, userId: session.user.id },
        include: { sets: true },
      });
      const durationSec = sessionDurationSec(full!.startedAt, new Date());
      const calories =
        typeof body.caloriesBurned === "number" && Number.isFinite(body.caloriesBurned)
          ? Math.max(0, Math.round(body.caloriesBurned))
          : null;

      const completed = await prisma.workoutSession.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          durationSec,
          caloriesBurned: calories,
          notes: body.notes,
          ...(typeof body.name === "string" && body.name.trim()
            ? { name: body.name.trim() }
            : {}),
        },
        include: { sets: true },
      });

      const existingPRs = await prisma.personalRecord.findMany({
        where: { userId: session.user.id },
        select: { recordType: true, value: true, exerciseLibraryId: true },
      });
      const prUpdates = computePRUpdates(
        completed.sets.map((s) => ({
          exerciseLibraryId: s.exerciseLibraryId,
          exerciseName: s.exerciseName,
          setNumber: s.setNumber,
          reps: s.reps,
          weightKg: s.weightKg,
          completed: s.completed,
        })),
        existingPRs
      );

      const newPRs = [];
      for (const pr of prUpdates) {
        const exId = pr.exerciseLibraryId;
        const record = await prisma.personalRecord.upsert({
          where: {
            userId_exerciseLibraryId_recordType: {
              userId: session.user.id,
              exerciseLibraryId: exId,
              recordType: pr.recordType,
            },
          },
          create: {
            userId: session.user.id,
            exerciseLibraryId: exId,
            recordType: pr.recordType,
            value: pr.value,
            reps: pr.reps,
            weightKg: pr.weightKg,
            sessionId: id,
          },
          update: {
            value: pr.value,
            reps: pr.reps,
            weightKg: pr.weightKg,
            achievedAt: new Date(),
            sessionId: id,
          },
        });
        newPRs.push(record);
      }

      const exerciseIds = completed.sets
        .map((s) => s.exerciseLibraryId)
        .filter((x): x is string => Boolean(x));
      await recordExerciseUsage(session.user.id, exerciseIds);

      const weekAgo = subDays(new Date(), 7);
      const weekSets = await prisma.workoutSet.findMany({
        where: {
          completed: true,
          session: {
            userId: session.user.id,
            status: "COMPLETED",
            completedAt: { gte: weekAgo },
            id: { not: id },
          },
        },
        select: { reps: true, weightKg: true },
      });
      const recentWeeklyVolume = weekSets.reduce(
        (a, s) => a + setVolume(s.reps, s.weightKg),
        0
      );

      const fullSets = await prisma.workoutSet.findMany({
        where: { workoutSessionId: id },
        include: { exercise: true },
      });
      const analysis = analyzeWorkoutSession(
        fullSets,
        durationSec,
        newPRs,
        recentWeeklyVolume
      );

      await awardXPForAction(session.user.id, "WORKOUT_COMPLETED");
      await updateTrainingStreak(session.user.id);
      // Activity streak (Home/Nutrition): training day counts like a food day.
      const { updateNutritionStreak } = await import("@/lib/nutrition-streak");
      await updateNutritionStreak(session.user.id, new Date()).catch(() => null);
      await upsertMissingPersonalRecords(session.user.id).catch(() => 0);
      const unlocks = await evaluateAndUnlockAchievements(session.user.id);
      const { loadNextWorkoutForUser } = await import("@/lib/plan-next-day");
      const nextWorkout = await loadNextWorkoutForUser(session.user.id).catch(
        () => null
      );

      return jsonOk({
        session: completed,
        newPRs,
        analysis,
        unlocks,
        nextWorkout,
        alreadyCompleted: false,
      });
    }

    if (ws.status !== "IN_PROGRESS") {
      return jsonError("Nur laufende Trainings können bearbeitet werden", 409);
    }

    const parsed = setPatchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    if (parsed.data.action === "addSet") {
      const created = await prisma.workoutSet.create({
        data: {
          workoutSessionId: id,
          exerciseLibraryId: parsed.data.exerciseLibraryId,
          exerciseName: parsed.data.exerciseName!,
          setNumber: parsed.data.setNumber!,
          reps: parsed.data.reps,
          weightKg: parsed.data.weightKg,
          rpe: parsed.data.rpe,
          restSeconds: parsed.data.restSeconds ?? 90,
          completed: false,
        },
      });
      return jsonOk({ set: created });
    }

    if (parsed.data.action === "deleteSet" && parsed.data.setId) {
      await prisma.workoutSet.deleteMany({
        where: { id: parsed.data.setId, workoutSessionId: id },
      });
      return jsonOk({ success: true });
    }

    if (parsed.data.action === "updateSet" && parsed.data.setId) {
      const setId = parsed.data.setId;
      if (parsed.data.completed === true) {
        const reps = parsed.data.reps;
        const weight = parsed.data.weightKg;
        if (reps == null || reps < 1 || reps > 100) {
          return jsonError("Wiederholungen ungültig", 400);
        }
        if (weight == null || weight < 0 || !Number.isFinite(weight)) {
          return jsonError("Gewicht ungültig", 400);
        }
      }
      const result = await prisma.workoutSet.updateMany({
        where: { id: setId, workoutSessionId: id },
        data: {
          exerciseName: parsed.data.exerciseName,
          reps: parsed.data.reps,
          weightKg: parsed.data.weightKg,
          rpe: parsed.data.rpe,
          restSeconds: parsed.data.restSeconds,
          completed: parsed.data.completed,
          notes: parsed.data.notes,
        },
      });
      if (result.count === 0) return jsonError("Satz nicht gefunden", 404);

      const updated = await prisma.workoutSet.findFirst({
        where: { id: setId, workoutSessionId: id },
      });
      return jsonOk({ set: updated });
    }

    return jsonError("Unbekannte Aktion", 400);
  } catch (e) {
    console.error("SESSION PATCH ERROR:", e);
    return handleApiError(e);
  }
}
