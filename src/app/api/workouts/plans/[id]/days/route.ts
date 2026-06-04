import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const patchSchema = z.object({
  dayId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  dayOrder: z.number().int().min(0).optional(),
});

const bulkSchema = z.object({
  action: z.literal("setup"),
  days: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      })
    )
    .min(1)
    .max(7),
});

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id: planId } = await params;
    const body = await req.json();

    const plan = await prisma.workoutPlan.findFirst({
      where: { id: planId, userId: session.user.id },
      include: { days: true },
    });
    if (!plan) return jsonError("Plan nicht gefunden", 404);

    if (body.action === "setup") {
      const parsed = bulkSchema.safeParse(body);
      if (!parsed.success) return jsonError("1–7 Trainingstage erforderlich");

      await prisma.workoutDay.deleteMany({ where: { workoutPlanId: planId } });
      const created = await prisma.$transaction(
        parsed.data.days.map((day, i) =>
          prisma.workoutDay.create({
            data: {
              workoutPlanId: planId,
              name: day.name,
              description: day.description ?? null,
              dayOrder: i,
            },
          })
        )
      );
      return jsonOk({ days: created }, 201);
    }

    if (plan.days.length >= 7) return jsonError("Maximal 7 Trainingstage pro Plan", 400);

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const maxOrder = Math.max(-1, ...plan.days.map((d) => d.dayOrder));
    const day = await prisma.workoutDay.create({
      data: {
        workoutPlanId: planId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        dayOrder: maxOrder + 1,
      },
    });

    return jsonOk({ day }, 201);
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
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const updated = await prisma.workoutDay.updateMany({
      where: {
        id: parsed.data.dayId,
        workoutPlanId: planId,
        plan: { userId: session.user.id },
      },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        dayOrder: parsed.data.dayOrder,
      },
    });
    if (!updated.count) return jsonError("Trainingstag nicht gefunden", 404);

    const day = await prisma.workoutDay.findUnique({ where: { id: parsed.data.dayId } });
    return jsonOk({ day });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id: planId } = await params;
    const dayId = req.nextUrl.searchParams.get("dayId");
    if (!dayId) return jsonError("dayId fehlt");

    const plan = await prisma.workoutPlan.findFirst({
      where: { id: planId, userId: session.user.id },
      include: { _count: { select: { days: true } } },
    });
    if (!plan) return jsonError("Plan nicht gefunden", 404);
    if (plan._count.days <= 1) return jsonError("Mindestens ein Trainingstag erforderlich", 400);

    await prisma.workoutDay.deleteMany({
      where: { id: dayId, workoutPlanId: planId },
    });
    return jsonOk({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}
