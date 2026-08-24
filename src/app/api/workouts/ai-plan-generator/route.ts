import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { chatCompletion } from "@/lib/openai";
import { createPlanFromCatalog } from "@/lib/workout-plans";
import {
  getBestCatalogKeyForInput,
  prescriptionForGoal,
  recommendCatalogPlans,
  scoreCatalogPlan,
} from "@/lib/plan-science-engine";
import type { PlanEquipmentFilter, PlanGoal, PlanLevel } from "@prisma/client";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { getCatalogPlan } from "@/lib/plan-catalog";

const schema = z.object({
  goal: z.enum(["MUSCLE_GAIN", "STRENGTH_GAIN", "FAT_LOSS", "RECOMP", "GENERAL_FITNESS"]),
  weightKg: z.number().positive(),
  heightCm: z.number().positive(),
  experience: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO"]),
  daysPerWeek: z.number().int().min(1).max(7),
  durationMinutes: z.number().int().min(30).max(120),
  equipment: z.enum(["GYM", "HOME_GYM", "DUMBBELLS_ONLY", "CALISTHENICS"]).optional(),
  priorityMuscles: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const equipment = (parsed.data.equipment ?? "GYM") as PlanEquipmentFilter;
    const level = parsed.data.experience as PlanLevel;
    const goal = parsed.data.goal as PlanGoal;

    const recInput = {
      goal,
      level,
      daysPerWeek: parsed.data.daysPerWeek,
      durationMinutes: parsed.data.durationMinutes,
      equipment,
      efficiency: "SCIENCE_OPTIMIZED" as const,
      priorityMuscles: parsed.data.priorityMuscles as never,
    };

    const ranked = recommendCatalogPlans(recInput);
    const catalogKey = ranked[0]?.catalogKey ?? getBestCatalogKeyForInput(recInput);
    const preset = getCatalogPlan(catalogKey);
    if (!preset) return jsonError("Kein passender Plan gefunden", 500);

    const scores = scoreCatalogPlan(preset, recInput);
    const rx = prescriptionForGoal(goal, level);

    const plan = await createPlanFromCatalog(
      session.user.id,
      catalogKey,
      `KI: ${preset.name}`
    );

    await prisma.$transaction(
      plan.days.flatMap((day) =>
        day.exercises.map((ex) =>
          prisma.workoutExercise.update({
            where: { id: ex.id },
            data: {
              targetSets: rx.setsPerExercise,
              targetReps: rx.reps,
              restSeconds: rx.restSeconds,
            },
          })
        )
      )
    );

    const bmi = parsed.data.weightKg / Math.pow(parsed.data.heightCm / 100, 2);
    let aiSummary = "";
    try {
      const { content } = await chatCompletion(
        [
          {
            role: "system",
            content:
              "Du bist ein evidenzbasierter Coach (Israetel/Nippard/RP). Erkläre auf Deutsch in 120 Wörtern, warum dieser Plan passt. Keine erfundenen Studien.",
          },
          {
            role: "user",
            content: JSON.stringify({
              plan: preset.name,
              goal,
              level,
              daysPerWeek: parsed.data.daysPerWeek,
              bmi: bmi.toFixed(1),
              scores,
              rationale: scores.rationale,
              sets: rx.setsPerExercise,
              reps: rx.reps,
            }),
          },
        ],
        session.user.id,
        { maxTokens: 700 }
      );
      aiSummary = content;
    } catch {
      aiSummary = scores.rationale.join(" ");
    }

    const refreshed = await prisma.workoutPlan.findFirst({
      where: { id: plan.id },
      include: {
        days: {
          orderBy: { dayOrder: "asc" },
          include: { exercises: { include: { exercise: true } } },
        },
      },
    });

    return jsonOk(
      {
        plan: refreshed,
        catalogKey,
        scores,
        prescription: rx,
        aiSummary,
        alternatives: ranked.slice(1, 4).map((r) => ({
          catalogKey: r.catalogKey,
          name: r.name,
          totalScore: r.scores.totalScore,
        })),
        generatedBy: "science_engine",
      },
      201
    );
  } catch (e) {
    console.error("AI PLAN GENERATOR ERROR:", e);
    return handleApiError(e);
  }
}
