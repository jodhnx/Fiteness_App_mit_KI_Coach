import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardingSchema, validationErrorMessage } from "@/lib/validations";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import {
  trainingGoalFromMainGoalKey,
  defaultNutritionGoalForMainGoal,
  estimateGoalWeeks,
  type MainGoalKey,
} from "@/lib/onboarding-options";
import { loadCaloriePlanContext } from "@/lib/calorie-health-context";
import { syncProfileTargetsToDb } from "@/lib/profile-targets-sync";
import { startOfDay, isValid } from "date-fns";
import { revalidateTag } from "next/cache";

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
    const userId = session.user.id;
    const trainingGoal = trainingGoalFromMainGoalKey(d.mainGoalKey as MainGoalKey);
    const nutritionGoal =
      d.nutritionGoal ?? defaultNutritionGoalForMainGoal(d.mainGoalKey as MainGoalKey);
    const workoutDaysPerWeek = d.workoutDaysPerWeek ?? 3;

    let targetWeightDate: Date | null = null;
    if (d.targetWeightDate) {
      const parsedDate = startOfDay(new Date(d.targetWeightDate));
      targetWeightDate = isValid(parsedDate) ? parsedDate : null;
    }

    const profileData = {
      age: d.age,
      weightKg: d.weightKg,
      heightCm: d.heightCm,
      gender: d.gender,
      activityLevel: d.activityLevel,
      trainingGoal,
      nutritionGoal,
      experienceLevel: d.experienceLevel,
      workoutDaysPerWeek,
      targetWeightKg: d.targetWeightKg ?? null,
      targetWeightDate,
      trainingLocation: d.trainingLocation ?? null,
      countryCode: d.countryCode === "DE" ? "DE" : "AT",
    };

    const profile = await prisma.profile.upsert({
      where: { userId },
      create: { userId, ...profileData },
      update: profileData,
    });

    const calorieContext = await loadCaloriePlanContext(userId);
    const synced = await syncProfileTargetsToDb(userId, profile, calorieContext);
    const finalProfile = synced?.profile ?? profile;
    const calc = synced?.calculations;

    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompletedAt: new Date(),
        ...(d.name ? { name: d.name.trim() } : {}),
      },
    });

    try {
      revalidateTag(`home-${userId}`);
    } catch {
      /* ignore */
    }

    return jsonOk({
      profile: finalProfile,
      calculations: calc
        ? {
            bmi: calc.bmi,
            bmr: calc.bmr,
            calorieTarget: calc.calorieTarget,
            proteinTargetG: calc.proteinTargetG,
            carbsTargetG: calc.carbsTargetG,
            fatTargetG: calc.fatTargetG,
            recommendedTrainingDays: calc.recommendedTrainingDays,
            estimatedGoalWeeks: estimateGoalWeeks(d.mainGoalKey as MainGoalKey),
          }
        : null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
