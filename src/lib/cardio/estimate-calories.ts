/**
 * MET-based calorie estimate for cardio.
 * Formula: kcal ≈ MET × bodyWeightKg × durationHours
 * Prefer measured wearable kcal when provided.
 */

import type { CardioIntensity, CardioCatalogItem } from "@/lib/cardio/cardio-types";
import { metForIntensity } from "@/lib/cardio/cardio-types";

export type CardioEstimateInput = {
  item: CardioCatalogItem;
  durationMin: number;
  intensity: CardioIntensity;
  weightKg?: number | null;
  /** Measured from wearable — preferred */
  measuredKcal?: number | null;
  avgHeartRate?: number | null;
};

export type CardioEstimateResult = {
  calories: number;
  estimated: boolean;
  label: string;
  met: number;
};

const DEFAULT_WEIGHT = 75;

export function estimateCardioCalories(input: CardioEstimateInput): CardioEstimateResult {
  if (input.measuredKcal != null && input.measuredKcal > 0) {
    return {
      calories: Math.round(input.measuredKcal),
      estimated: false,
      label: "Gemessene verbrannte Kalorien",
      met: metForIntensity(input.item, input.intensity),
    };
  }

  const weight = input.weightKg && input.weightKg > 30 ? input.weightKg : DEFAULT_WEIGHT;
  const hours = Math.max(0, input.durationMin) / 60;
  let met = metForIntensity(input.item, input.intensity);

  // Mild HR adjustment when available (no invented absolute mapping)
  if (input.avgHeartRate && input.avgHeartRate > 100) {
    if (input.avgHeartRate >= 160) met *= 1.12;
    else if (input.avgHeartRate >= 140) met *= 1.06;
    else if (input.avgHeartRate < 110) met *= 0.92;
  }

  const kcal = met * weight * hours;
  return {
    calories: Math.max(0, Math.round(kcal)),
    estimated: true,
    label: "Geschätzte verbrannte Kalorien",
    met,
  };
}
