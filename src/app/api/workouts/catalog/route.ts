import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  filterCatalogPlans,
  getCatalogPlan,
  PLAN_CATALOG,
  type CatalogFilters,
} from "@/lib/plan-catalog";
import { recommendCatalogPlans, scoreCatalogPlan } from "@/lib/plan-science-engine";
import type {
  MuscleGroup,
  PlanEfficiency,
  PlanEquipmentFilter,
  PlanGoal,
  PlanLevel,
} from "@prisma/client";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const p = req.nextUrl.searchParams;
    const catalogKey = p.get("key");

    if (catalogKey) {
      const plan = getCatalogPlan(catalogKey);
      if (!plan) return jsonError("Plan nicht gefunden", 404);

      const slugs = plan.days.flatMap((d) => d.exerciseSlugs);
      const exercises = await prisma.exerciseLibrary.findMany({
        where: { slug: { in: slugs } },
      });
      const bySlug = new Map(exercises.map((e) => [e.slug, e]));

      const daysWithExercises = plan.days.map((day) => ({
        ...day,
        exercises: day.exerciseSlugs
          .map((slug) => bySlug.get(slug))
          .filter(Boolean),
        exerciseCount: day.exerciseSlugs.filter((s) => bySlug.has(s)).length,
      }));

      const totalExercises = daysWithExercises.reduce((a, d) => a + d.exerciseCount, 0);

      const goal = (p.get("goal") ?? plan.goal) as PlanGoal;
      const level = (p.get("level") ?? plan.level) as PlanLevel;
      const scores = scoreCatalogPlan(plan, {
        goal,
        level,
        daysPerWeek: plan.daysPerWeek,
        durationMinutes: plan.durationMinutes,
        equipment: (p.get("equipment") as PlanEquipmentFilter) ?? plan.equipment[0] ?? "GYM",
        efficiency: (p.get("efficiency") as PlanEfficiency) ?? "SCIENCE_OPTIMIZED",
      });

      return jsonOk({
        plan: {
          ...plan,
          days: daysWithExercises,
          totalExercises,
          estimatedDurationMin: plan.durationMinutes,
          scores,
        },
      });
    }

    const useRecommend = p.get("recommend") === "1";
    if (useRecommend) {
      const goal = (p.get("goal") ?? "MUSCLE_GAIN") as PlanGoal;
      const level = (p.get("level") ?? "INTERMEDIATE") as PlanLevel;
      const recommendations = recommendCatalogPlans({
        goal,
        level,
        daysPerWeek: Number(p.get("daysPerWeek") ?? 4),
        durationMinutes: Number(p.get("durationMinutes") ?? 60),
        equipment: (p.get("equipment") ?? "GYM") as PlanEquipmentFilter,
        priorityMuscles: p.get("priorityMuscles")?.split(",") as MuscleGroup[] | undefined,
        efficiency: (p.get("efficiency") ?? "SCIENCE_OPTIMIZED") as PlanEfficiency,
      });
      return jsonOk({
        plans: recommendations.map((r) => ({
          catalogKey: r.catalogKey,
          name: r.name,
          description: r.description,
          goal: r.goal,
          level: r.level,
          daysPerWeek: r.daysPerWeek,
          durationMinutes: r.durationMinutes,
          scienceBased: r.scienceBased,
          rank: r.rank,
          scores: r.scores,
          dayCount: r.days.length,
        })),
        topPick: recommendations[0]?.catalogKey,
      });
    }

    const filters: CatalogFilters = {};
    const goal = p.get("goal") as PlanGoal | null;
    const level = p.get("level") as PlanLevel | null;
    const efficiency = p.get("efficiency") as PlanEfficiency | null;
    const days = p.get("daysPerWeek");
    const duration = p.get("durationMinutes");
    const equipment = p.get("equipment") as PlanEquipmentFilter | null;
    const scienceOnly = p.get("scienceOnly") === "1";

    if (goal) filters.goal = goal;
    if (level) filters.level = level;
    if (efficiency) filters.efficiency = efficiency;
    if (days) filters.daysPerWeek = Number(days);
    if (duration) filters.durationMinutes = Number(duration);
    if (equipment) filters.equipment = equipment;
    if (scienceOnly) filters.scienceOnly = true;

    const filtered = filterCatalogPlans(filters);

    return jsonOk({
      plans: filtered.map((plan) => ({
        catalogKey: plan.catalogKey,
        name: plan.name,
        description: plan.description,
        template: plan.template,
        goal: plan.goal,
        level: plan.level,
        efficiency: plan.efficiency,
        daysPerWeek: plan.daysPerWeek,
        durationMinutes: plan.durationMinutes,
        equipment: plan.equipment,
        scienceBased: plan.scienceBased,
        dayCount: plan.days.length,
        exerciseCount: plan.days.reduce((a, d) => a + d.exerciseSlugs.length, 0),
      })),
      total: filtered.length,
      allCount: PLAN_CATALOG.length,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
