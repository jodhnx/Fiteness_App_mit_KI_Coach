import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreUserPlan } from "@/lib/plan-science-engine";
import type { MuscleGroup, PlanGoal, PlanLevel } from "@prisma/client";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;
    const goal = (req.nextUrl.searchParams.get("goal") ?? "MUSCLE_GAIN") as PlanGoal;
    const level = (req.nextUrl.searchParams.get("level") ?? "INTERMEDIATE") as PlanLevel;

    const plan = await prisma.workoutPlan.findFirst({
      where: { id, userId: session.user.id },
      select: {
        name: true,
        days: {
          orderBy: { dayOrder: "asc" },
          select: {
            name: true,
            exercises: {
              select: {
                targetSets: true,
                exercise: { select: { muscleGroup: true } },
              },
            },
          },
        },
      },
    });
    if (!plan) return jsonError("Plan nicht gefunden", 404);

    const scores = scoreUserPlan({
      goal,
      level,
      daysPerWeek: plan.days.length,
      days: plan.days.map((d) => ({
        name: d.name,
        exercises: d.exercises.map((e) => ({
          muscleGroup: e.exercise.muscleGroup as MuscleGroup,
          targetSets: e.targetSets,
        })),
      })),
    });

    return jsonOk({ scores, planName: plan.name });
  } catch (e) {
    return handleApiError(e);
  }
}
