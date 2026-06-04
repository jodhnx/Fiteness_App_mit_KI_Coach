import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { dbQuery } from "@/lib/prisma";
import type { Profile } from "@prisma/client";
import { settingsSchema, validationErrorMessage } from "@/lib/validations";
import { trainingGoalFromNutritionGoal } from "@/lib/nutrition";
import { profileToMetricsInput } from "@/lib/profile-calculations";
import { computeProfileTargets, type CaloriePlanContext } from "@/lib/calorie-target";
import { loadCaloriePlanContext } from "@/lib/calorie-health-context";
import { revalidateTag } from "next/cache";
import {
  applySmartGoalsToProfilePatch,
  shouldRecalculateCalories,
  smartGoalCaloriePreview,
} from "@/lib/smart-goals";
import { buildProfileUpsertData } from "@/lib/profile-patch";
import { startOfDay, isValid } from "date-fns";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { isSchemaMismatchError } from "@/lib/prisma-errors";

function logProfile(step: string, detail?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development" || process.env.DEBUG_PROFILE === "1") {
    console.log("[api/profile]", step, detail ?? "");
  }
}

function mergeProfile(
  existing: Profile | null,
  patch: Record<string, unknown>,
  calorieContext?: CaloriePlanContext
): Record<string, unknown> {
  const withSmart = applySmartGoalsToProfilePatch(existing, patch);
  const mergedSmart = { ...(existing ?? {}), ...withSmart } as Profile;
  const input = profileToMetricsInput(mergedSmart);
  if (!input) return withSmart;

  const manual = patch.manualCalorieTarget === true;
  const recalc = shouldRecalculateCalories(patch);
  const computed = computeProfileTargets(mergedSmart, calorieContext);

  if (!computed) return withSmart;

  return {
    ...withSmart,
    trainingGoal:
      mergedSmart.trainingGoal ?? trainingGoalFromNutritionGoal(input.nutritionGoal),
    nutritionGoal: input.nutritionGoal,
    calorieTarget:
      manual && !recalc && patch.calorieTarget != null
        ? patch.calorieTarget
        : computed.calorieTarget,
    proteinTargetG:
      manual && patch.proteinTargetG != null ? patch.proteinTargetG : computed.proteinTargetG,
    carbsTargetG:
      manual && patch.carbsTargetG != null ? patch.carbsTargetG : computed.carbsTargetG,
    fatTargetG: manual && patch.fatTargetG != null ? patch.fatTargetG : computed.fatTargetG,
    bmi: computed.bmi,
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    logProfile("GET start", { userId: session.user.id });

    const [profile, user, calorieContext] = await Promise.all([
      dbQuery("profile.get", (db) =>
        db.profile.findUnique({ where: { userId: session.user.id } })
      ),
      dbQuery("user.get", (db) =>
        db.user.findUnique({
          where: { id: session.user.id },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            onboardingCompletedAt: true,
          },
        })
      ),
      loadCaloriePlanContext(session.user.id),
    ]);

    const calculations = profile
      ? computeProfileTargets(profile, calorieContext)
      : null;

    logProfile("GET ok");
    return jsonOk({
      user,
      profile,
      onboardingCompleted: Boolean(user?.onboardingCompletedAt),
      calculations,
      smartGoal: profile ? smartGoalCaloriePreview(profile) : null,
    });
  } catch (e) {
    logProfile("GET error", { message: e instanceof Error ? e.message : String(e) });
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  const started = Date.now();
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const userId = session.user.id;
    logProfile("PATCH start", { userId });

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

    const { name, manualCalorieTarget, ...profileFields } = parsed.data;

    if (name) {
      await dbQuery("user.updateName", (db) =>
        db.user.update({ where: { id: userId }, data: { name } })
      );
      logProfile("PATCH user name ok");
    }

    const existing = await dbQuery("profile.findExisting", (db) =>
      db.profile.findUnique({ where: { userId } })
    );

    const raw: Record<string, unknown> = {
      ...profileFields,
      ...(manualCalorieTarget === true ? { manualCalorieTarget: true } : {}),
    };

    if (raw.targetWeightDate && typeof raw.targetWeightDate === "string") {
      const d = startOfDay(new Date(raw.targetWeightDate));
      raw.targetWeightDate = isValid(d) ? d : undefined;
    }

    const calorieContext = await loadCaloriePlanContext(userId);
    logProfile("PATCH context loaded");

    const merged = mergeProfile(existing, raw, calorieContext);
    const { create, update } = buildProfileUpsertData(userId, merged);

    const profile = await dbQuery("profile.upsert", (db) =>
      db.profile.upsert({
        where: { userId },
        create: create as Parameters<typeof db.profile.upsert>[0]["create"],
        update: update as Parameters<typeof db.profile.upsert>[0]["update"],
      })
    );

    logProfile("PATCH prisma upsert ok", {
      calorieTarget: profile.calorieTarget,
      ms: Date.now() - started,
    });

    const user = await dbQuery("user.getAfterPatch", (db) =>
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, image: true },
      })
    );

    try {
      revalidateTag(`home-${userId}`);
    } catch (revalidateErr) {
      console.warn("[api/profile] revalidateTag failed", revalidateErr);
    }

    const calculations = computeProfileTargets(profile, calorieContext);

    logProfile("PATCH success", { ms: Date.now() - started });

    return jsonOk({
      user,
      profile,
      calculations,
      smartGoal: smartGoalCaloriePreview(profile),
    });
  } catch (e) {
    logProfile("PATCH error", {
      ms: Date.now() - started,
      message: e instanceof Error ? e.message : String(e),
    });
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
