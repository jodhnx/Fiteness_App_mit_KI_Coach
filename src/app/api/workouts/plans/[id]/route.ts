import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

const planInclude = {
  days: {
    orderBy: { dayOrder: "asc" as const },
    include: {
      exercises: {
        orderBy: { orderIndex: "asc" as const },
        include: { exercise: true },
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
      include: planInclude,
    });
    if (!plan) return jsonError("Plan nicht gefunden", 404);
    return jsonOk({ plan });
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

    const plan = await prisma.workoutPlan.updateMany({
      where: { id, userId: session.user.id },
      data: updateData,
    });

    const updated = await prisma.workoutPlan.findFirst({
      where: { id, userId: session.user.id },
      include: planInclude,
    });

    return jsonOk({ plan: updated, updated: plan.count });
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
