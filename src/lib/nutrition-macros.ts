/**
 * Science-based daily nutrition targets.
 * Single source of truth for protein / fat / carbs from calories + body weight.
 *
 * Protein: ~1.6–2.2 g/kg (goal-dependent)
 * Fat:     ~0.6–1.0 g/kg (goal-dependent)
 * Carbs:   remaining calories after protein + fat
 */

import type { NutritionGoal, TrainingGoal } from "@prisma/client";

export type NutritionMacroTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/** Absolute hard caps — never suggest these as normal defaults. */
export const MAX_SUGGESTED_PROTEIN_G = 250;
export const MAX_ABSOLUTE_PROTEIN_G = 280;
export const MIN_PROTEIN_G = 60;
export const MAX_FAT_G = 150;
export const MIN_FAT_G = 30;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Plausible adult body weight for target math (kg). */
export function sanitizeWeightKgForTargets(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 35 || n > 250) return null;
  return Math.round(n * 10) / 10;
}

export function sanitizeHeightCmForTargets(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 120 || n > 230) return null;
  return Math.round(n);
}

export function sanitizeAgeForTargets(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 14 || n > 100) return null;
  return Math.round(n);
}

/**
 * Protein g/kg — ISSN-aligned band 1.6–2.2.
 * Cut: higher (muscle retention). Bulk: mid-high. Maintenance: mid.
 */
export function proteinGramsPerKg(
  nutritionGoal?: NutritionGoal | null,
  trainingGoal?: TrainingGoal | null
): number {
  const goal = nutritionGoal ?? null;
  if (goal === "FAT_LOSS" || trainingGoal === "LOSE_WEIGHT") return 2.1;
  if (
    goal === "MUSCLE_GAIN" ||
    trainingGoal === "GAIN_MUSCLE" ||
    trainingGoal === "STRENGTH"
  ) {
    return 1.95;
  }
  if (goal === "LEAN_BULK") return 1.85;
  if (goal === "RECOMP") return 1.8;
  if (trainingGoal === "ENDURANCE") return 1.65;
  return 1.7; // MAINTENANCE / default
}

/** Fat g/kg — keep dietary fat adequate, never extreme. */
export function fatGramsPerKg(
  nutritionGoal?: NutritionGoal | null,
  trainingGoal?: TrainingGoal | null
): number {
  const goal = nutritionGoal ?? null;
  if (goal === "FAT_LOSS" || trainingGoal === "LOSE_WEIGHT") return 0.7;
  if (goal === "MUSCLE_GAIN" || trainingGoal === "GAIN_MUSCLE") return 0.9;
  if (goal === "LEAN_BULK") return 0.85;
  if (goal === "RECOMP") return 0.8;
  return 0.8;
}

/**
 * Build macros so protein×4 + carbs×4 + fat×9 ≈ calories (± rounding).
 */
export function calculateMacros(
  calories: number,
  trainingGoal: TrainingGoal,
  nutritionGoal?: NutritionGoal | null,
  weightKg?: number | null
): NutritionMacroTargets {
  const kcal = Math.round(Number(calories) || 0);
  if (kcal <= 0) {
    return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  }

  const weight = sanitizeWeightKgForTargets(weightKg);
  if (weight == null) {
    // No weight → conservative fallback (~30% P / 25% F), then clamp hard
    let proteinG = Math.round((kcal * 0.28) / 4);
    let fatG = Math.round((kcal * 0.25) / 9);
    proteinG = clamp(proteinG, MIN_PROTEIN_G, MAX_SUGGESTED_PROTEIN_G);
    fatG = clamp(fatG, MIN_FAT_G, MAX_FAT_G);
    return finalizeMacros(kcal, proteinG, fatG);
  }

  let proteinG = Math.round(weight * proteinGramsPerKg(nutritionGoal, trainingGoal));
  let fatG = Math.round(weight * fatGramsPerKg(nutritionGoal, trainingGoal));

  const maxProtein = Math.min(Math.round(weight * 2.4), MAX_SUGGESTED_PROTEIN_G);
  const minProtein = Math.max(Math.round(weight * 1.4), MIN_PROTEIN_G);
  proteinG = clamp(proteinG, minProtein, maxProtein);

  const maxFat = Math.min(Math.round(weight * 1.15), MAX_FAT_G);
  const minFat = Math.max(Math.round(weight * 0.55), MIN_FAT_G);
  fatG = clamp(fatG, minFat, maxFat);

  return finalizeMacros(kcal, proteinG, fatG);
}

function finalizeMacros(
  calories: number,
  proteinG: number,
  fatG: number
): NutritionMacroTargets {
  let p = proteinG;
  let f = fatG;

  // Protein + fat must leave room for some carbs when calories allow
  const maxPfKcal = Math.floor(calories * 0.92);
  let pfKcal = p * 4 + f * 9;
  if (pfKcal > maxPfKcal && maxPfKcal > 0) {
    const scale = maxPfKcal / pfKcal;
    p = Math.max(MIN_PROTEIN_G, Math.round(p * scale));
    f = Math.max(MIN_FAT_G, Math.round(f * scale));
    pfKcal = p * 4 + f * 9;
    while (pfKcal > maxPfKcal && f > MIN_FAT_G) {
      f -= 1;
      pfKcal = p * 4 + f * 9;
    }
    while (pfKcal > maxPfKcal && p > MIN_PROTEIN_G) {
      p -= 1;
      pfKcal = p * 4 + f * 9;
    }
  }

  let carbsG = Math.round((calories - p * 4 - f * 9) / 4);
  if (carbsG < 0) carbsG = 0;

  // Nudge carbs so macro kcal ≈ target (prefer carbs for ±1–2 g drift)
  let macroKcal = p * 4 + carbsG * 4 + f * 9;
  const drift = calories - macroKcal;
  if (Math.abs(drift) >= 4) {
    carbsG = Math.max(0, carbsG + Math.round(drift / 4));
  }

  return {
    calories,
    proteinG: p,
    carbsG,
    fatG: f,
  };
}

/** True when stored macros look invented / broken (e.g. 500 g protein). */
export function areStoredMacrosPlausible(input: {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  weightKg?: number | null;
}): boolean {
  const { calories, proteinG, carbsG, fatG, weightKg } = input;
  if (!(calories > 0) || proteinG <= 0 || fatG <= 0 || carbsG < 0) return false;
  if (proteinG > MAX_ABSOLUTE_PROTEIN_G) return false;
  if (fatG > 220 || fatG < 15) return false;

  const weight = sanitizeWeightKgForTargets(weightKg);
  if (weight != null && proteinG > weight * 2.6) return false;
  if (weight != null && proteinG > Math.max(weight * 2.4, 200) && proteinG > 200) {
    return false;
  }

  const macroKcal = proteinG * 4 + carbsG * 4 + fatG * 9;
  const tolerance = Math.max(150, calories * 0.18);
  if (Math.abs(macroKcal - calories) > tolerance) return false;

  return true;
}

/** Soft warning for manual edits — does not block save. */
export function isProteinTargetAggressive(
  proteinG: number,
  weightKg?: number | null
): boolean {
  if (!(proteinG > 0)) return false;
  if (proteinG > MAX_SUGGESTED_PROTEIN_G) return true;
  const weight = sanitizeWeightKgForTargets(weightKg);
  if (weight != null && proteinG > weight * 2.3) return true;
  return false;
}
