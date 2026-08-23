import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import {
  defaultPlanSets,
  repsSummaryFromSets,
  serializePlanSetTargets,
  type PlanSetTarget,
} from "@/lib/plan-exercise-sets";
import type { Prisma } from "@prisma/client";
import { recordExerciseUsage } from "@/lib/workout-plans";

const setTargetSchema = z.object({
  weightKg: z.number().nullable().optional(),
  reps: z.number().int().positive().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

const addSchema = z.object({
  workoutDayId: z.string(),
  exerciseLibraryId: z.string(),
  targetSets: z.number().int().positive().optional(),
  targetReps: z.string().optional(),
  restSeconds: z.number().int().positive().optional(),
  setTargets: z.array(setTargetSchema).optional(),
});

const replaceSchema = z.object({
  workoutExerciseId: z.string(),
  newExerciseLibraryId: z.string(),
});

const updateSchema = z.object({
  workoutExerciseId: z.string(),
  targetSets: z.number().int().positive().optional(),
  targetReps: z.string().optional(),
  restSeconds: z.number().int().positive().optional(),
  setTargets: z.array(setTargetSchema).optional(),
  notes: z.string().optional(),
});

function normalizeSetTargets(input?: PlanSetTarget[]): PlanSetTarget[] {
  const sets = serializePlanSetTargets(input?.length ? input : defaultPlanSets());
  return sets;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id: planId } = await params;
    const body = await req.json();

    if (body.action === "replace") {
      const parsed = replaceSchema.safeParse(body);
      if (!parsed.success) return jsonError("Ungültige Eingabe");
      const updated = await prisma.workoutExercise.updateMany({
        where: {
          id: parsed.data.workoutExerciseId,
          day: { workoutPlanId: planId, plan: { userId: session.user.id } },
        },
        data: { exerciseLibraryId: parsed.data.newExerciseLibraryId },
      });
      if (!updated.count) return jsonError("Übung nicht gefunden", 404);
      const ex = await prisma.workoutExercise.findFirst({
        where: {
          id: parsed.data.workoutExerciseId,
          day: { workoutPlanId: planId, plan: { userId: session.user.id } },
        },
        include: { exercise: true },
      });
      return jsonOk({ exercise: ex });
    }

    const parsed = addSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const day = await prisma.workoutDay.findFirst({
      where: { id: parsed.data.workoutDayId, workoutPlanId: planId, plan: { userId: session.user.id } },
    });
    if (!day) return jsonError("Trainingstag nicht gefunden", 404);

    const duplicate = await prisma.workoutExercise.findFirst({
      where: {
        workoutDayId: day.id,
        exerciseLibraryId: parsed.data.exerciseLibraryId,
      },
    });
    if (duplicate) return jsonError("Diese Übung ist bereits im Workout", 409);

    const maxOrder = await prisma.workoutExercise.aggregate({
      where: { workoutDayId: day.id },
      _max: { orderIndex: true },
    });

    const setTargets = normalizeSetTargets(
      parsed.data.setTargets as PlanSetTarget[] | undefined
    );
    const ex = await prisma.workoutExercise.create({
      data: {
        workoutDayId: day.id,
        exerciseLibraryId: parsed.data.exerciseLibraryId,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
        targetSets: parsed.data.targetSets ?? setTargets.length,
        targetReps: parsed.data.targetReps ?? repsSummaryFromSets(setTargets),
        restSeconds: parsed.data.restSeconds ?? 90,
        setTargets: setTargets as Prisma.InputJsonValue,
      },
      include: { exercise: true },
    });

    void recordExerciseUsage(session.user.id, [parsed.data.exerciseLibraryId]);

    return jsonOk({ exercise: ex }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id: planId } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const setTargets = parsed.data.setTargets
      ? normalizeSetTargets(parsed.data.setTargets as PlanSetTarget[])
      : undefined;

    const updated = await prisma.workoutExercise.updateMany({
      where: {
        id: parsed.data.workoutExerciseId,
        day: { workoutPlanId: planId, plan: { userId: session.user.id } },
      },
      data: {
        targetSets: setTargets?.length ?? parsed.data.targetSets,
        targetReps:
          setTargets != null
            ? repsSummaryFromSets(setTargets)
            : parsed.data.targetReps,
        restSeconds: parsed.data.restSeconds,
        setTargets:
          setTargets != null ? (setTargets as Prisma.InputJsonValue) : undefined,
        notes: parsed.data.notes,
      },
    });
    if (!updated.count) return jsonError("Übung nicht gefunden", 404);

    const ex = await prisma.workoutExercise.findFirst({
      where: {
        id: parsed.data.workoutExerciseId,
        day: { workoutPlanId: planId, plan: { userId: session.user.id } },
      },
      include: { exercise: true },
    });
    return jsonOk({ exercise: ex });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const exerciseId = req.nextUrl.searchParams.get("exerciseId");
    if (!exerciseId) return jsonError("exerciseId fehlt");

    await prisma.workoutExercise.deleteMany({
      where: { id: exerciseId, day: { plan: { userId: session.user.id } } },
    });
    return jsonOk({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}
