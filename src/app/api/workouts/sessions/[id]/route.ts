import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { awardXPForAction } from "@/lib/gamification";
import { evaluateAndUnlockAchievements } from "@/lib/achievement-engine";
import { recordExerciseUsage, updateTrainingStreak } from "@/lib/workout-plans";
import { computePRUpdates, sessionDurationSec, setVolume } from "@/lib/workout-metrics";
import { analyzeWorkoutSession } from "@/lib/workout-session-analysis";
import { subDays } from "date-fns";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

const setPatchSchema = z.object({
  setId: z.string().optional(),
  action: z.enum(["updateSet", "addSet", "deleteSet", "complete", "cancel"]),
  exerciseLibraryId: z.string().optional(),
  exerciseName: z.string().optional(),
  setNumber: z.number().int().positive().optional(),
  reps: z.number().optional(),
  weightKg: z.number().optional(),
  rpe: z.number().optional(),
  restSeconds: z.number().optional(),
  completed: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;
    const workoutSession = await prisma.workoutSession.findFirst({
      where: { id, userId: session.user.id },
      include: {
        sets: { orderBy: [{ exerciseName: "asc" }, { setNumber: "asc" }] },
        plan: true,
        day: { include: { exercises: { include: { exercise: true } } } },
      },
    });
    if (!workoutSession) return jsonError("Session nicht gefunden", 404);

    const previousByExercise: Record<string, typeof workoutSession.sets> = {};
    for (const s of workoutSession.sets) {
      const key = s.exerciseLibraryId ?? s.exerciseName;
      if (!previousByExercise[key]) {
        const prev = await prisma.workoutSet.findMany({
          where: {
            exerciseLibraryId: s.exerciseLibraryId ?? undefined,
            exerciseName: s.exerciseName,
            session: {
              userId: session.user.id,
              status: "COMPLETED",
              id: { not: id },
            },
          },
          orderBy: { session: { completedAt: "desc" } },
          take: 10,
        });
        previousByExercise[key] = prev as typeof workoutSession.sets;
      }
    }

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
    await prisma.workoutSet.deleteMany({ where: { workoutSessionId: id } });
    await prisma.workoutSession.deleteMany({
      where: { id, userId: session.user.id },
    });
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
      await prisma.workoutSession.update({
        where: { id },
        data: { status: "CANCELLED", completedAt: new Date() },
      });
      return jsonOk({ success: true });
    }

    if (body.action === "complete") {
      const full = await prisma.workoutSession.findFirst({
        where: { id },
        include: { sets: true },
      });
      const durationSec = sessionDurationSec(full!.startedAt, new Date());
      const completed = await prisma.workoutSession.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          durationSec,
          caloriesBurned: body.caloriesBurned ?? Math.round(durationSec / 60 * 8),
          notes: body.notes,
          ...(typeof body.name === "string" && body.name.trim()
            ? { name: body.name.trim() }
            : {}),
        },
        include: { sets: true },
      });

      const existingPRs = await prisma.personalRecord.findMany({
        where: { userId: session.user.id },
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
        existingPRs.map((p) => ({ recordType: p.recordType, value: p.value }))
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
      const unlocks = await evaluateAndUnlockAchievements(session.user.id);

      return jsonOk({ session: completed, newPRs, analysis, unlocks });
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
      const updated = await prisma.workoutSet.update({
        where: { id: parsed.data.setId },
        data: {
          reps: parsed.data.reps,
          weightKg: parsed.data.weightKg,
          rpe: parsed.data.rpe,
          restSeconds: parsed.data.restSeconds,
          completed: parsed.data.completed,
          notes: parsed.data.notes,
        },
      });
      return jsonOk({ set: updated });
    }

    return jsonError("Unbekannte Aktion", 400);
  } catch (e) {
    console.error("SESSION PATCH ERROR:", e);
    return handleApiError(e);
  }
}
