import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Profile } from "@prisma/client";
import { settingsSchema, validationErrorMessage } from "@/lib/validations";
import { trainingGoalFromNutritionGoal } from "@/lib/nutrition";
import {
  profileToMetricsInput,
  recalculateProfileTargets,
} from "@/lib/profile-calculations";
import { applySmartGoalsToProfilePatch, smartGoalCaloriePreview } from "@/lib/smart-goals";
import { buildProfileUpsertData } from "@/lib/profile-patch";
import { startOfDay, isValid } from "date-fns";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { isSchemaMismatchError } from "@/lib/prisma-errors";

function mergeProfile(
  existing: Profile | null,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const withSmart = applySmartGoalsToProfilePatch(existing, patch);
  const mergedSmart = { ...(existing ?? {}), ...withSmart } as Profile;

  const input = profileToMetricsInput(mergedSmart);
  if (!input) return withSmart;

  const calc = recalculateProfileTargets(input);
  const smart = smartGoalCaloriePreview(mergedSmart);
  const useAutoCalories = patch.calorieTarget == null;
  const useAutoProtein = patch.proteinTargetG == null;
  const useAutoCarbs = patch.carbsTargetG == null;
  const useAutoFat = patch.fatTargetG == null;

  return {
    ...withSmart,
    trainingGoal: mergedSmart.trainingGoal ?? trainingGoalFromNutritionGoal(input.nutritionGoal),
    nutritionGoal: input.nutritionGoal,
    calorieTarget: useAutoCalories
      ? (smart?.calorieTarget ?? calc.calorieTarget)
      : patch.calorieTarget,
    proteinTargetG: useAutoProtein ? calc.proteinTargetG : patch.proteinTargetG,
    carbsTargetG: useAutoCarbs ? calc.carbsTargetG : patch.carbsTargetG,
    fatTargetG: useAutoFat ? calc.fatTargetG : patch.fatTargetG,
    bmi: calc.bmi,
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        onboardingCompletedAt: true,
      },
    });
    const metrics = profile ? profileToMetricsInput(profile) : null;
    return jsonOk({
      user,
      profile,
      onboardingCompleted: Boolean(user?.onboardingCompletedAt),
      calculations: metrics ? recalculateProfileTargets(metrics) : null,
      smartGoal: profile ? smartGoalCaloriePreview(profile) : null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Ungültige Anfrage", 400);
    }

    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[api/profile] validation", parsed.error.flatten());
      return jsonError(validationErrorMessage(parsed), 400);
    }

    const { name, ...profileFields } = parsed.data;
    if (name) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name },
      });
    }

    const existing = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    const raw = { ...profileFields } as Record<string, unknown>;
    if (raw.targetWeightDate && typeof raw.targetWeightDate === "string") {
      const d = startOfDay(new Date(raw.targetWeightDate));
      raw.targetWeightDate = isValid(d) ? d : undefined;
    }

    const merged = mergeProfile(existing, raw);
    const { create, update } = buildProfileUpsertData(session.user.id, merged);

    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: create as Parameters<typeof prisma.profile.upsert>[0]["create"],
      update: update as Parameters<typeof prisma.profile.upsert>[0]["update"],
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, image: true },
    });

    const metrics = profileToMetricsInput(profile);
    return jsonOk({
      user,
      profile,
      calculations: metrics ? recalculateProfileTargets(metrics) : null,
      smartGoal: smartGoalCaloriePreview(profile),
    });
  } catch (e) {
    if (isSchemaMismatchError(e)) {
      console.error("[api/profile] schema mismatch", e);
      return jsonError(
        "Datenbank-Schema veraltet. Bitte ausführen: npx prisma migrate deploy",
        503
      );
    }
    console.error("[api/profile] PATCH error", e);
    return handleApiError(e);
  }
}
