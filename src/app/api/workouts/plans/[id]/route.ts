import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { sessionDurationSec, setVolume } from "@/lib/workout-metrics";
import { subDays } from "date-fns";
import { buildCompletedDayIds, resolveDayStatus, type DayStatus } from "@/lib/plan-day-status";

type Params = { params: Promise<{ id: string }> };

const planSelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  archivedAt: true,
  days: {
    orderBy: { dayOrder: "asc" as const },
    select: {
      id: true,
      name: true,
      description: true,
      dayOrder: true,
      exercises: {
        orderBy: { orderIndex: "asc" as const },
        select: {
          id: true,
          orderIndex: true,
          targetSets: true,
          targetReps: true,
          restSeconds: true,
          setTargets: true,
          exercise: {
            select: { id: true, name: true, muscleGroup: true },
          },
        },
      },
    },
  },
};

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;
    const plan = await prisma.workoutPlan.findFirst({
      where: { id, userId: session.user.id },
      select: planSelect,
    });
    if (!plan) return jsonError("Plan nicht gefunden", 404);

    const lastSessions = await prisma.workoutSession.findMany({
      where: {
        workoutPlanId: id,
        userId: session.user.id,
        status: "COMPLETED",
      },
      orderBy: { completedAt: "desc" },
      take: 30,
      select: {
        workoutDayId: true,
        completedAt: true,
        startedAt: true,
        sets: { select: { reps: true, weightKg: true } },
      },
    });

    const dayStats: Record<
      string,
      { lastSessionAt: string; volumeKg: number; durationSec: number }
    > = {};
    for (const ws of lastSessions) {
      if (!ws.workoutDayId || dayStats[ws.workoutDayId]) continue;
      const volumeKg = ws.sets.reduce(
        (acc, s) => acc + setVolume(s.reps, s.weightKg),
        0
      );
      dayStats[ws.workoutDayId] = {
        lastSessionAt: (ws.completedAt ?? ws.startedAt).toISOString(),
        volumeKg,
        durationSec: sessionDurationSec(ws.startedAt, ws.completedAt),
      };
    }

    const since = subDays(new Date(), 14);
    const cycleSessions = await prisma.workoutSession.findMany({
      where: {
        workoutPlanId: id,
        userId: session.user.id,
        status: "COMPLETED",
        completedAt: { gte: since },
      },
      select: { workoutDayId: true, completedAt: true },
    });
    const completedDayIds = buildCompletedDayIds(cycleSessions, 14);

    const dayStatuses: Record<string, DayStatus> = {};
    for (const day of plan.days) {
      if (day.exercises.length === 0) continue;
      dayStatuses[day.id] = resolveDayStatus(
        day.exercises.length,
        completedDayIds,
        day.id
      );
    }

    return jsonOk({ plan, dayStats, dayStatuses });
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

    if (body.reorderDays && Array.isArray(body.reorderDays)) {
      for (const item of body.reorderDays as { id: string; dayOrder: number }[]) {
        await prisma.workoutDay.updateMany({
          where: { id: item.id, plan: { userId: session.user.id } },
          data: { dayOrder: item.dayOrder },
        });
      }
    }

    if (body.reorderExercises && Array.isArray(body.reorderExercises)) {
      for (const item of body.reorderExercises as { id: string; orderIndex: number }[]) {
        await prisma.workoutExercise.updateMany({
          where: { id: item.id, day: { plan: { userId: session.user.id } } },
          data: { orderIndex: item.orderIndex },
        });
      }
    }

    const updateData: {
      name?: string;
      description?: string;
      isActive?: boolean;
      archivedAt?: Date | null;
    } = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.archive === true) {
      updateData.archivedAt = new Date();
      updateData.isActive = false;
    }
    if (body.unarchive === true) {
      updateData.archivedAt = null;
      updateData.isActive = true;
    }

    if (Object.keys(updateData).length === 0) {
      return jsonOk({ updated: 0 });
    }

    const plan = await prisma.workoutPlan.updateMany({
      where: { id, userId: session.user.id },
      data: updateData,
    });

    return jsonOk({ updated: plan.count });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;
    await prisma.workoutPlan.deleteMany({
      where: { id, userId: session.user.id },
    });
    return jsonOk({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}
