import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { computeNutritionRemaining } from "@/lib/nutrition-display";
import { nutritionDayKey } from "@/lib/nutrition-day";

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

function fidelityScore(d: NutritionDashboardPayload | null | undefined): number {
  if (!d) return -1;
  const meals = d.mealsByType?.reduce((n, m) => n + (m.items?.length ?? 0), 0) ?? 0;
  return (d.targets?.calories ?? 0) > 0
    ? 1000 + (d.consumed?.calories ?? 0) + meals * 10
    : d.consumed?.calories ?? 0;
}

/**
 * One display dashboard for Home.
 * Prefer the snapshot that already has today's logged meals — never paint
 * a zero-intake shell over cached consumed calories.
 */
export function canonicalNutritionForDisplay(
  central: NutritionDashboardPayload,
  home: HomeDataPayload
): NutritionDashboardPayload {
  const today = nutritionDayKey();
  const homeN =
    home.nutrition && (home.nutrition.targets?.calories ?? 0) > 0
      ? home.nutrition
      : null;

  const centralReady = (central.targets?.calories ?? 0) > 0;
  const homeReady = homeN != null;

  if (centralReady && homeReady) {
    const centralToday = !central.date || central.date === today;
    const homeToday = !homeN.date || homeN.date === today;
    if (centralToday && homeToday) {
      // Same day: keep the richer meal log (avoids 0-kcal flash).
      return fidelityScore(homeN) > fidelityScore(central) ? homeN : central;
    }
    if (homeToday && !centralToday) return homeN;
    if (centralToday) return central;
  }

  if (centralReady) return central;
  if (homeReady) return homeN!;

  if ((home.calorieTarget ?? 0) <= 0) return central;

  const targets = {
    ...central.targets,
    calories: home.calorieTarget,
    proteinG: home.proteinTarget || central.targets.proteinG,
  };
  const consumed =
    (home.caloriesIntake ?? 0) > (central.consumed?.calories ?? 0)
      ? {
          ...central.consumed,
          calories: home.caloriesIntake ?? 0,
          proteinG: home.proteinConsumed ?? central.consumed.proteinG,
        }
      : central.consumed;

  return {
    ...central,
    profileComplete: true,
    targets,
    consumed,
    remaining: computeNutritionRemaining({
      targets,
      consumed,
      exerciseBurned: central.exerciseBurned,
    }),
  };
}
