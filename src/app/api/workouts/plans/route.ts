import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { createPlanFromTemplate, createPlanFromCatalog } from "@/lib/workout-plans";
import { PLAN_CATALOG } from "@/lib/plan-catalog";
import type { PlanTemplateType } from "@prisma/client";

const createSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  template: z.enum([
    "PUSH_PULL_LEGS",
    "UPPER_LOWER",
    "FULL_BODY",
    "BRO_SPLIT",
    "BEGINNER",
    "HYPERTROPHY",
    "FAT_LOSS",
    "STRENGTH",
    "SCIENCE_PPL",
    "SCIENCE_UPPER_LOWER",
    "SCIENCE_FULL_BODY",
    "HYPERTROPHY_FOCUS",
    "STRENGTH_FOCUS",
    "CUTTING_FOCUS",
    "CUSTOM",
  ]),
  catalogKey: z.string().optional(),
  description: z.string().max(1000).optional(),
  days: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      })
    )
    .min(1)
    .max(7)
    .optional(),
});

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

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const archived = req.nextUrl.searchParams.get("archived") === "1";
    const plans = await prisma.workoutPlan.findMany({
      where: {
        userId: session.user.id,
        archivedAt: archived ? { not: null } : null,
      },
      include: planInclude,
      orderBy: { updatedAt: "desc" },
    });

    return jsonOk({ plans, catalogCount: PLAN_CATALOG.length });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const template = parsed.data.template as PlanTemplateType;

    if (parsed.data.catalogKey) {
      const plan = await createPlanFromCatalog(
        session.user.id,
        parsed.data.catalogKey,
        parsed.data.name
      );
      return jsonOk({ plan }, 201);
    }

    if (template !== "CUSTOM") {
      const plan = await createPlanFromTemplate(
        session.user.id,
        template,
        parsed.data.name
      );
      return jsonOk({ plan }, 201);
    }

    const dayTemplates =
      parsed.data.days ??
      [{ name: "Tag 1", description: "Erster Trainingstag – Übungen hinzufügen." }];

    const plan = await prisma.workoutPlan.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name ?? "Mein Plan",
        template: "CUSTOM",
        description: parsed.data.description,
        days: {
          create: dayTemplates.map((d, i) => ({
            name: d.name,
            description: d.description ?? null,
            dayOrder: i,
          })),
        },
      },
      include: planInclude,
    });

    return jsonOk({ plan }, 201);
  } catch (e) {
    console.error("PLAN CREATE ERROR:", e);
    return handleApiError(e);
  }
}
