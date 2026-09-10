import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { computeNutritionRemaining } from "@/lib/nutrition-display";

/** Map shared nutrition dashboard → home macro fields (same numbers as Ernährung page) */
export function nutritionDashboardToHomeMacros(
  d: NutritionDashboardPayload
): Pick<
  HomeDataPayload,
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

/**
 * One display dashboard for Home. Central store first; boot home only fills
 * a missing target so "Ziel festlegen" never flashes when the profile already has one.
 */
export function canonicalNutritionForDisplay(
  central: NutritionDashboardPayload,
  home: HomeDataPayload
): NutritionDashboardPayload {
  if ((central.targets?.calories ?? 0) > 0) return central;
  if (home.nutrition && (home.nutrition.targets?.calories ?? 0) > 0) {
    return home.nutrition;
  }
  if ((home.calorieTarget ?? 0) <= 0) return central;

  const targets = {
    ...central.targets,
    calories: home.calorieTarget,
    proteinG: home.proteinTarget || central.targets.proteinG,
  };
  return {
    ...central,
    profileComplete: true,
    targets,
    remaining: computeNutritionRemaining({
      targets,
      consumed: central.consumed,
      exerciseBurned: central.exerciseBurned,
    }),
  };
}
