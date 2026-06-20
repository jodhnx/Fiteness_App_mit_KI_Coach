import type { Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  computeProfileTargets,
  type CaloriePlanContext,
} from "@/lib/calorie-target";
import { loadCaloriePlanContext } from "@/lib/calorie-health-context";
import type { CalculatedTargets } from "@/lib/profile-types";
import { recommendedTrainingDays } from "@/lib/profile-training-days";
import { trainingGoalFromNutritionGoal } from "@/lib/nutrition";

/** Read persisted targets from Profile — single source of truth for all pages. */
export function readStoredProfileTargets(profile: Profile | null): CalculatedTargets | null {
  if (
    !profile?.calorieTarget ||
    !profile.proteinTargetG ||
    profile.age == null ||
    !profile.weightKg ||
    !profile.heightCm
  ) {
    return null;
  }

  const nutritionGoal = profile.nutritionGoal ?? "MAINTENANCE";
  const trainingGoal =
    profile.trainingGoal ?? trainingGoalFromNutritionGoal(nutritionGoal);

  return {
    bmi: profile.bmi ?? 0,
    bmr: 0,
    calorieTarget: profile.calorieTarget,
    proteinTargetG: profile.proteinTargetG,
    carbsTargetG: profile.carbsTargetG ?? 0,
    fatTargetG: profile.fatTargetG ?? 0,
    recommendedTrainingDays: recommendedTrainingDays(
      profile.workoutDaysPerWeek,
      trainingGoal
    ),
  };
}

/** Compute targets with health context and persist to Profile. */
export async function syncProfileTargetsToDb(
  userId: string,
  profile?: Profile | null,
  context?: CaloriePlanContext
): Promise<{ profile: Profile; calculations: CalculatedTargets } | null> {
  const existing =
    profile ?? (await prisma.profile.findUnique({ where: { userId } }));
  if (!existing) return null;

  const calorieContext = context ?? (await loadCaloriePlanContext(userId));
  const computed = computeProfileTargets(existing, calorieContext);
  if (!computed) return null;

  const updated = await prisma.profile.update({
    where: { userId },
    data: {
      calorieTarget: computed.calorieTarget,
      proteinTargetG: computed.proteinTargetG,
      carbsTargetG: computed.carbsTargetG,
      fatTargetG: computed.fatTargetG,
      bmi: computed.bmi,
    },
  });

  return { profile: updated, calculations: computed };
}

export { GENDER_LABELS, TRAINING_LOCATION_LABELS } from "@/lib/profile-labels";
