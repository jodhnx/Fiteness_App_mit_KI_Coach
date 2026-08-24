import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { createPlanFromTemplate, createPlanFromCatalog } from "@/lib/workout-plans";
import { PLAN_CATALOG } from "@/lib/plan-catalog";
import type { PlanTemplateType } from "@prisma/client";
import { subDays } from "date-fns";
import { resolveDayStatus, type DayStatus } from "@/lib/plan-day-status";

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

const planListSelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  archivedAt: true,
  updatedAt: true,
  days: {
    orderBy: { dayOrder: "asc" as const },
    select: {
      id: true,
      name: true,
      dayOrder: true,
      exercises: { select: { id: true } },
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
      select: planListSelect,
      orderBy: { updatedAt: "desc" },
    });

    const planIds = plans.map((p) => p.id);
    const lastSessions =
      planIds.length > 0
        ? await prisma.workoutSession.findMany({
            where: {
              userId: session.user.id,
              workoutPlanId: { in: planIds },
              status: "COMPLETED",
            },
            orderBy: { completedAt: "desc" },
            select: { workoutPlanId: true, completedAt: true },
          })
        : [];

    const since = subDays(new Date(), 14);
    const cycleSessions =
      planIds.length > 0
        ? await prisma.workoutSession.findMany({
            where: {
              userId: session.user.id,
              workoutPlanId: { in: planIds },
              status: "COMPLETED",
              completedAt: { gte: since },
            },
            select: { workoutPlanId: true, workoutDayId: true, completedAt: true },
          })
        : [];

    const completedByPlan = new Map<string, Set<string>>();
    for (const s of cycleSessions) {
      if (!s.workoutPlanId || !s.workoutDayId) continue;
      if (!completedByPlan.has(s.workoutPlanId)) {
        completedByPlan.set(s.workoutPlanId, new Set());
      }
      completedByPlan.get(s.workoutPlanId)!.add(s.workoutDayId);
    }

    const lastByPlan = new Map<string, string>();
    for (const s of lastSessions) {
      if (s.workoutPlanId && !lastByPlan.has(s.workoutPlanId) && s.completedAt) {
        lastByPlan.set(s.workoutPlanId, s.completedAt.toISOString());
      }
    }

    const enriched = plans.map((p) => {
      const completedIds = completedByPlan.get(p.id) ?? new Set<string>();
      const dayStatuses = p.days
        .filter((d) => d.exercises.length > 0)
        .map((d) => ({
          id: d.id,
          name: d.name,
          status: resolveDayStatus(d.exercises.length, completedIds, d.id) as DayStatus,
        }));
      return {
        ...p,
        lastSessionAt: lastByPlan.get(p.id) ?? null,
        dayStatuses,
      };
    });

    return jsonOk({ plans: enriched, catalogCount: PLAN_CATALOG.length });
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
      select: { id: true, name: true },
    });

    return jsonOk({ plan }, 201);
  } catch (e) {
    console.error("PLAN CREATE ERROR:", e);
    return handleApiError(e);
  }
}
