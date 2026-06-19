import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardingSchema, validationErrorMessage } from "@/lib/validations";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { recalculateProfileTargets } from "@/lib/profile-calculations";
import {
  trainingGoalFromMainGoalKey,
  defaultNutritionGoalForMainGoal,
  estimateGoalWeeks,
  type MainGoalKey,
} from "@/lib/onboarding-options";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompletedAt: true, emailVerified: true },
    });
    return jsonOk({
      completed: Boolean(user?.onboardingCompletedAt),
      emailVerified: Boolean(user?.emailVerified),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const body = await req.json();
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(validationErrorMessage(parsed), 400);
    }

    const d = parsed.data;
    const trainingGoal = trainingGoalFromMainGoalKey(d.mainGoalKey as MainGoalKey);
    const nutritionGoal =
      d.nutritionGoal ?? defaultNutritionGoalForMainGoal(d.mainGoalKey as MainGoalKey);
    const workoutDaysPerWeek = d.workoutDaysPerWeek ?? 3;
    const calc = recalculateProfileTargets({
      age: d.age,
      weightKg: d.weightKg,
      heightCm: d.heightCm,
      gender: d.gender,
      activityLevel: d.activityLevel,
      trainingGoal,
      nutritionGoal,
      workoutDaysPerWeek,
    });

    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        age: d.age,
        weightKg: d.weightKg,
        heightCm: d.heightCm,
        gender: d.gender,
        activityLevel: d.activityLevel,
        trainingGoal,
        nutritionGoal,
        experienceLevel: d.experienceLevel,
        workoutDaysPerWeek,
        calorieTarget: calc.calorieTarget,
        proteinTargetG: calc.proteinTargetG,
        carbsTargetG: calc.carbsTargetG,
        fatTargetG: calc.fatTargetG,
        bmi: calc.bmi,
      },
      update: {
        age: d.age,
        weightKg: d.weightKg,
        heightCm: d.heightCm,
        gender: d.gender,
        activityLevel: d.activityLevel,
        trainingGoal,
        nutritionGoal,
        experienceLevel: d.experienceLevel,
        workoutDaysPerWeek,
        calorieTarget: calc.calorieTarget,
        proteinTargetG: calc.proteinTargetG,
        carbsTargetG: calc.carbsTargetG,
        fatTargetG: calc.fatTargetG,
        bmi: calc.bmi,
      },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompletedAt: new Date(),
        ...(d.name ? { name: d.name.trim() } : {}),
      },
    });

    return jsonOk({
      profile,
      calculations: {
        bmi: calc.bmi,
        bmr: calc.bmr,
        calorieTarget: calc.calorieTarget,
        proteinTargetG: calc.proteinTargetG,
        carbsTargetG: calc.carbsTargetG,
        fatTargetG: calc.fatTargetG,
        recommendedTrainingDays: calc.recommendedTrainingDays,
        estimatedGoalWeeks: estimateGoalWeeks(d.mainGoalKey as MainGoalKey),
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
