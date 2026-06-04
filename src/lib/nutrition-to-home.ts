import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";

/** Map shared nutrition dashboard → home macro fields (same numbers as Ernährung page) */
export function nutritionDashboardToHomeMacros(
  d: NutritionDashboardPayload
): Pick<
  import("@/lib/home-defaults").HomeDataPayload,
  | "caloriesIntake"
  | "calorieTarget"
  | "caloriesRemaining"
  | "proteinConsumed"
  | "proteinTarget"
  | "proteinRemaining"
> {
  return {
    caloriesIntake: Math.round(d.consumed.calories),
    calorieTarget: d.targets.calories,
    caloriesRemaining: Math.max(0, Math.round(d.remaining.calories)),
    proteinConsumed: Math.round(d.consumed.proteinG),
    proteinTarget: d.targets.proteinG,
    proteinRemaining: Math.max(0, Math.round(d.remaining.proteinG)),
  };
}
