import { differenceInDays, isAfter } from "date-fns";
import type { ActivityLevel, Gender, NutritionGoal, Profile, TrainingGoal } from "@prisma/client";
import { calculateBMR, calculateMacros, trainingGoalFromNutritionGoal } from "@/lib/nutrition";
import { recommendedTrainingDays, type CalculatedTargets, type ProfileMetricsInput } from "@/lib/profile-calculations";

function calculateBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

/** Mifflin-St Jeor activity factors (TDEE = BMR × factor) */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

/** Zielabhängige Anpassung auf TDEE (nach Trainings-/Schritt-/Cardio-Bonus) */
const GOAL_ADJUSTMENT: Record<
  NutritionGoal,
  { defaultPct: number; minPct: number; maxPct: number }
> = {
  FAT_LOSS: { defaultPct: -0.175, minPct: -0.25, maxPct: -0.1 },
  MAINTENANCE: { defaultPct: 0, minPct: 0, maxPct: 0 },
  LEAN_BULK: { defaultPct: 0.075, minPct: 0.05, maxPct: 0.1 },
  MUSCLE_GAIN: { defaultPct: 0.15, minPct: 0.1, maxPct: 0.2 },
  RECOMP: { defaultPct: 0, minPct: -0.05, maxPct: 0.05 },
};

const KCAL_PER_KG = 7700;
const MIN_CALORIES = 1200;
const MAX_CALORIES = 6000;

export type CaloriePlanContext = {
  /** Ø Schritte/Tag (7-Tage oder heute) */
  averageDailySteps?: number | null;
  /** Ø aktive Minuten/Tag (Cardio + Sport) */
  averageActiveMinutes?: number | null;
};

export type CaloriePlanInput = {
  age: number;
  weightKg: number;
  heightCm: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  nutritionGoal: NutritionGoal;
  trainingGoal?: TrainingGoal;
  workoutDaysPerWeek?: number | null;
  targetWeightKg?: number | null;
  targetWeightDate?: Date | null;
  context?: CaloriePlanContext;
};

export type CaloriePlanBreakdown = {
  bmr: number;
  activityFactor: number;
  tdee: number;
  trainingBonusPct: number;
  stepsBonusPct: number;
  cardioBonusPct: number;
  adjustedTdee: number;
  goalPct: number;
  goalCalories: number;
  dateAdjustedCalories: number | null;
  calorieTarget: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Trainingshäufigkeit: 0–1 / 2–3 / 4–5 / 6–7 Tage → Extra auf TDEE */
export function trainingFrequencyBonusPct(workoutDaysPerWeek?: number | null): number {
  const d = workoutDaysPerWeek ?? 0;
  if (d <= 1) return 0;
  if (d <= 3) return 0.03;
  if (d <= 5) return 0.06;
  return 0.09;
}

/** Schritte: zusätzliche NEAT */
export function stepsBonusPct(averageDailySteps?: number | null): number {
  const s = averageDailySteps ?? 0;
  if (s >= 15_000) return 0.05;
  if (s >= 12_000) return 0.03;
  if (s >= 10_000) return 0.015;
  if (s >= 8_000) return 0.008;
  return 0;
}

/** Cardio / aktive Minuten */
export function cardioBonusPct(averageActiveMinutes?: number | null): number {
  const m = averageActiveMinutes ?? 0;
  if (m >= 75) return 0.06;
  if (m >= 45) return 0.04;
  if (m >= 25) return 0.02;
  return 0;
}

function goalPercentForInput(
  nutritionGoal: NutritionGoal,
  trainingGoal: TrainingGoal
): number {
  const band = GOAL_ADJUSTMENT[nutritionGoal];
  let pct = band.defaultPct;

  if (nutritionGoal === "MUSCLE_GAIN") {
    if (trainingGoal === "GAIN_MUSCLE" || trainingGoal === "STRENGTH") {
      pct = band.maxPct;
    }
  } else if (nutritionGoal === "LEAN_BULK") {
    pct = trainingGoal === "GAIN_MUSCLE" ? band.maxPct : band.defaultPct;
  } else if (nutritionGoal === "FAT_LOSS") {
    if (trainingGoal === "LOSE_WEIGHT") pct = band.minPct;
    else if (trainingGoal === "ENDURANCE") pct = (band.minPct + band.defaultPct) / 2;
  } else if (nutritionGoal === "RECOMP") {
    pct = 0;
  }

  return clamp(pct, band.minPct, band.maxPct);
}

/** Kalorienbedarf laut Zielgewicht bis Datum (auf Basis TDEE) */
export function caloriesForWeightDeadline(
  tdee: number,
  weightKg: number,
  targetWeightKg: number,
  targetDate: Date
): number | null {
  const days = Math.max(14, differenceInDays(targetDate, new Date()));
  if (days <= 0 || Math.abs(targetWeightKg - weightKg) < 0.2) return null;

  const kgChange = targetWeightKg - weightKg;
  const dailyDelta = (kgChange * KCAL_PER_KG) / days;
  return Math.round(tdee + dailyDelta);
}

function mergeGoalAndDateTargets(
  goalCalories: number,
  tdee: number,
  dateCalories: number | null,
  nutritionGoal: NutritionGoal,
  kgChange: number
): number {
  if (dateCalories == null) return goalCalories;

  const losing = kgChange < -0.2;
  const gaining = kgChange > 0.2;

  if (nutritionGoal === "FAT_LOSS" || losing) {
    return Math.round(Math.min(goalCalories, dateCalories));
  }
  if (nutritionGoal === "MUSCLE_GAIN" || nutritionGoal === "LEAN_BULK" || gaining) {
    return Math.round(Math.max(goalCalories, dateCalories));
  }
  return Math.round((goalCalories + dateCalories) / 2);
}

/**
 * Zentrale Kalorienberechnung — einzige Quelle für Zielkalorien in der App.
 */
export function computeCaloriePlan(input: CaloriePlanInput): CaloriePlanBreakdown {
  const trainingGoal =
    input.trainingGoal ?? trainingGoalFromNutritionGoal(input.nutritionGoal);

  const bmr = Math.round(
    calculateBMR(input.weightKg, input.heightCm, input.age, input.gender)
  );
  const activityFactor = ACTIVITY_MULTIPLIERS[input.activityLevel];
  const tdee = Math.round(bmr * activityFactor);

  const trainingBonusPct = trainingFrequencyBonusPct(input.workoutDaysPerWeek);
  const stepsPct = stepsBonusPct(input.context?.averageDailySteps);
  const cardioPct = cardioBonusPct(input.context?.averageActiveMinutes);
  const bonusPct = trainingBonusPct + stepsPct + cardioPct;

  const adjustedTdee = Math.round(tdee * (1 + bonusPct));
  const goalPct = goalPercentForInput(input.nutritionGoal, trainingGoal);
  const goalCalories = Math.round(adjustedTdee * (1 + goalPct));

  let dateCalories: number | null = null;
  const targetKg = input.targetWeightKg;
  const targetDate = input.targetWeightDate;
  if (targetKg != null && targetDate && isAfter(targetDate, new Date())) {
    dateCalories = caloriesForWeightDeadline(
      adjustedTdee,
      input.weightKg,
      targetKg,
      targetDate
    );
  }

  const kgChange = targetKg != null ? targetKg - input.weightKg : 0;
  const calorieTarget = clamp(
    mergeGoalAndDateTargets(
      goalCalories,
      adjustedTdee,
      dateCalories,
      input.nutritionGoal,
      kgChange
    ),
    MIN_CALORIES,
    MAX_CALORIES
  );

  return {
    bmr,
    activityFactor,
    tdee,
    trainingBonusPct,
    stepsBonusPct: stepsPct,
    cardioBonusPct: cardioPct,
    adjustedTdee,
    goalPct,
    goalCalories,
    dateAdjustedCalories: dateCalories,
    calorieTarget,
  };
}

export function profileToCaloriePlanInput(
  profile: Profile,
  context?: CaloriePlanContext
): CaloriePlanInput | null {
  if (
    !profile.age ||
    !profile.weightKg ||
    !profile.heightCm ||
    !profile.gender ||
    !profile.activityLevel
  ) {
    return null;
  }

  const nutritionGoal = profile.nutritionGoal ?? "MAINTENANCE";
  return {
    age: profile.age,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    gender: profile.gender,
    activityLevel: profile.activityLevel,
    nutritionGoal,
    trainingGoal:
      profile.trainingGoal ?? trainingGoalFromNutritionGoal(nutritionGoal),
    workoutDaysPerWeek: profile.workoutDaysPerWeek,
    targetWeightKg: profile.targetWeightKg,
    targetWeightDate: profile.targetWeightDate,
    context,
  };
}

export function computeCaloriePlanFromProfile(
  profile: Profile,
  context?: CaloriePlanContext
): CaloriePlanBreakdown | null {
  const input = profileToCaloriePlanInput(profile, context);
  if (!input) return null;
  return computeCaloriePlan(input);
}

/** Makros + BMI — für Profil-API und Einstellungen */
export function computeProfileTargets(
  profile: Profile,
  context?: CaloriePlanContext
): CalculatedTargets | null {
  const plan = computeCaloriePlanFromProfile(profile, context);
  if (!plan) return null;

  const nutritionGoal = profile.nutritionGoal ?? "MAINTENANCE";
  const trainingGoal =
    profile.trainingGoal ?? trainingGoalFromNutritionGoal(nutritionGoal);
  const macros = calculateMacros(plan.calorieTarget, trainingGoal, nutritionGoal);

  return {
    bmi: calculateBMI(profile.weightKg!, profile.heightCm!),
    bmr: plan.bmr,
    calorieTarget: plan.calorieTarget,
    proteinTargetG: macros.proteinG,
    carbsTargetG: macros.carbsG,
    fatTargetG: macros.fatG,
    recommendedTrainingDays: recommendedTrainingDays(
      profile.workoutDaysPerWeek,
      trainingGoal
    ),
  };
}

export type NutritionTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterTargetMl: number;
  nutritionGoal: Profile["nutritionGoal"];
  profileComplete: boolean;
};

export function nutritionTargetsFromProfile(
  profile: Profile | null,
  context?: CaloriePlanContext
): NutritionTargets {
  const profileComplete = Boolean(
    profile?.weightKg &&
      profile.heightCm &&
      profile.age &&
      profile.gender &&
      profile.activityLevel
  );

  if (!profile || !profileComplete) {
    return {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      waterTargetMl: profile?.waterTargetMl ?? 2500,
      nutritionGoal: profile?.nutritionGoal ?? null,
      profileComplete: false,
    };
  }

  const computed = computeProfileTargets(profile, context);
  if (!computed) {
    return {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      waterTargetMl: profile.waterTargetMl ?? 2500,
      nutritionGoal: profile.nutritionGoal ?? null,
      profileComplete: false,
    };
  }

  return {
    calories: computed.calorieTarget,
    proteinG: computed.proteinTargetG,
    carbsG: computed.carbsTargetG,
    fatG: computed.fatTargetG,
    waterTargetMl: profile.waterTargetMl ?? 2500,
    nutritionGoal: profile.nutritionGoal ?? null,
    profileComplete: true,
  };
}

/** @deprecated use computeCaloriePlanFromProfile — Alias für Smart-Goals */
export function resolveCalorieTarget(
  profile: Profile,
  context?: CaloriePlanContext
): number | null {
  return computeCaloriePlanFromProfile(profile, context)?.calorieTarget ?? null;
}

function metricsToPlanInput(
  metrics: ProfileMetricsInput,
  targetWeightKg?: number | null,
  targetWeightDate?: Date | null,
  context?: CaloriePlanContext
): CaloriePlanInput {
  return {
    age: metrics.age,
    weightKg: metrics.weightKg,
    heightCm: metrics.heightCm,
    gender: metrics.gender,
    activityLevel: metrics.activityLevel,
    nutritionGoal: metrics.nutritionGoal,
    trainingGoal: metrics.trainingGoal,
    workoutDaysPerWeek: metrics.workoutDaysPerWeek,
    targetWeightKg: targetWeightKg ?? null,
    targetWeightDate: targetWeightDate ?? null,
    context,
  };
}

/** Client-side Vorschau (Einstellungen) */
export function previewTargetsFromForm(fields: {
  age?: string | number;
  weightKg?: string | number;
  heightCm?: string | number;
  gender?: Gender | string;
  activityLevel?: ActivityLevel;
  trainingGoal?: TrainingGoal;
  nutritionGoal?: NutritionGoal;
  workoutDaysPerWeek?: string | number;
  targetWeightKg?: string | number;
  targetWeightDate?: string;
}): CalculatedTargets | null {
  const age = Number(fields.age);
  const weightKg = Number(fields.weightKg);
  const heightCm = Number(fields.heightCm);
  if (
    !Number.isFinite(age) ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    !fields.gender ||
    !fields.activityLevel ||
    !fields.nutritionGoal
  ) {
    return null;
  }

  const nutritionGoal = fields.nutritionGoal as NutritionGoal;
  const trainingGoal =
    (fields.trainingGoal as TrainingGoal) ?? trainingGoalFromNutritionGoal(nutritionGoal);
  const workoutDays = fields.workoutDaysPerWeek
    ? Number(fields.workoutDaysPerWeek)
    : undefined;

  const targetKg = fields.targetWeightKg ? Number(fields.targetWeightKg) : null;
  const targetDateStr = fields.targetWeightDate?.trim();
  const targetDate =
    targetKg != null && Number.isFinite(targetKg) && targetDateStr
      ? new Date(targetDateStr)
      : null;

  const plan = computeCaloriePlan(
    metricsToPlanInput(
      {
        age,
        weightKg,
        heightCm,
        gender: fields.gender as Gender,
        activityLevel: fields.activityLevel as ActivityLevel,
        trainingGoal,
        nutritionGoal,
        workoutDaysPerWeek: Number.isFinite(workoutDays) ? workoutDays : undefined,
      },
      targetKg,
      targetDate && !Number.isNaN(targetDate.getTime()) ? targetDate : null
    )
  );

  const macros = calculateMacros(plan.calorieTarget, trainingGoal, nutritionGoal);
  return {
    bmi: calculateBMI(weightKg, heightCm),
    bmr: plan.bmr,
    calorieTarget: plan.calorieTarget,
    proteinTargetG: macros.proteinG,
    carbsTargetG: macros.carbsG,
    fatTargetG: macros.fatG,
    recommendedTrainingDays: recommendedTrainingDays(
      Number.isFinite(workoutDays) ? workoutDays : undefined,
      trainingGoal
    ),
  };
}

/** Beispielrechnungen für Doku / Tests */
export function exampleCaloriePlans(): {
  label: string;
  plan: CaloriePlanBreakdown;
}[] {
  const base = {
    age: 28,
    heightCm: 182,
    gender: "MALE" as Gender,
    activityLevel: "VERY_ACTIVE" as ActivityLevel,
    workoutDaysPerWeek: 5,
  };

  return [
    {
      label: "Bulk — 82 kg, Muskelaufbau, sehr aktiv, 5× Training",
      plan: computeCaloriePlan({
        ...base,
        weightKg: 82,
        nutritionGoal: "MUSCLE_GAIN",
        trainingGoal: "GAIN_MUSCLE",
      }),
    },
    {
      label: "Maintenance — 78 kg",
      plan: computeCaloriePlan({
        ...base,
        weightKg: 78,
        activityLevel: "MODERATE",
        workoutDaysPerWeek: 3,
        nutritionGoal: "MAINTENANCE",
      }),
    },
    {
      label: "Cut — 85 kg, Fettabbau, moderat aktiv",
      plan: computeCaloriePlan({
        age: 30,
        weightKg: 85,
        heightCm: 180,
        gender: "MALE",
        activityLevel: "MODERATE",
        workoutDaysPerWeek: 4,
        nutritionGoal: "FAT_LOSS",
        trainingGoal: "LOSE_WEIGHT",
      }),
    },
  ];
}
