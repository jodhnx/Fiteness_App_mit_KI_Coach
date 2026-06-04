import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { recommendCatalogPlans } from "@/lib/plan-science-engine";
import type { MuscleGroup, PlanEquipmentFilter, PlanGoal, PlanLevel } from "@prisma/client";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

const schema = z.object({
  goal: z.enum(["MUSCLE_GAIN", "STRENGTH_GAIN", "FAT_LOSS", "RECOMP", "GENERAL_FITNESS"]),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO"]),
  daysPerWeek: z.number().int().min(1).max(7),
  durationMinutes: z.number().int().min(30).max(120),
  equipment: z.enum(["GYM", "HOME_GYM", "DUMBBELLS_ONLY", "CALISTHENICS"]),
  priorityMuscles: z.array(z.string()).optional(),
  efficiency: z
    .enum(["MAX_EFFICIENCY", "TIME_OPTIMIZED", "SCIENCE_OPTIMIZED"])
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const recommendations = recommendCatalogPlans({
      goal: parsed.data.goal,
      level: parsed.data.level,
      daysPerWeek: parsed.data.daysPerWeek,
      durationMinutes: parsed.data.durationMinutes,
      equipment: parsed.data.equipment as PlanEquipmentFilter,
      priorityMuscles: parsed.data.priorityMuscles as MuscleGroup[] | undefined,
      efficiency: parsed.data.efficiency,
    });

    return jsonOk({
      recommendations: recommendations.slice(0, 8).map((r) => ({
        catalogKey: r.catalogKey,
        name: r.name,
        description: r.description,
        daysPerWeek: r.daysPerWeek,
        durationMinutes: r.durationMinutes,
        scienceBased: r.scienceBased,
        rank: r.rank,
        scores: r.scores,
      })),
      topPick: recommendations[0]
        ? {
            catalogKey: recommendations[0].catalogKey,
            name: recommendations[0].name,
            totalScore: recommendations[0].scores.totalScore,
            rationale: recommendations[0].scores.rationale,
          }
        : null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const p = req.nextUrl.searchParams;
    const parsed = schema.safeParse({
      goal: p.get("goal") ?? "MUSCLE_GAIN",
      level: p.get("level") ?? "INTERMEDIATE",
      daysPerWeek: Number(p.get("daysPerWeek") ?? 4),
      durationMinutes: Number(p.get("durationMinutes") ?? 60),
      equipment: p.get("equipment") ?? "GYM",
      efficiency: p.get("efficiency") ?? "SCIENCE_OPTIMIZED",
      priorityMuscles: p.get("priorityMuscles")?.split(",").filter(Boolean),
    });
    if (!parsed.success) return jsonError("Ungültige Filter");

    const recommendations = recommendCatalogPlans({
      goal: parsed.data.goal as PlanGoal,
      level: parsed.data.level as PlanLevel,
      daysPerWeek: parsed.data.daysPerWeek,
      durationMinutes: parsed.data.durationMinutes,
      equipment: parsed.data.equipment as PlanEquipmentFilter,
      priorityMuscles: parsed.data.priorityMuscles as MuscleGroup[] | undefined,
      efficiency: parsed.data.efficiency,
    });

    return jsonOk({ recommendations: recommendations.slice(0, 8) });
  } catch (e) {
    return handleApiError(e);
  }
}
