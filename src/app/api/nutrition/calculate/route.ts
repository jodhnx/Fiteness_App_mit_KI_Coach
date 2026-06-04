import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
    if (
      !profile?.weightKg ||
      !profile.heightCm ||
      !profile.age ||
      !profile.gender ||
      !profile.activityLevel
    ) {
      return jsonError("Profil unvollständig – bitte Alter, Gewicht, Größe etc. ausfüllen");
    }
    const { resolveTargets } = await import("@/lib/nutrition-service");
    const targets = resolveTargets(profile);
    return jsonOk({
      calories: targets.calories,
      proteinG: targets.proteinG,
      carbsG: targets.carbsG,
      fatG: targets.fatG,
      waterTargetMl: targets.waterTargetMl,
      nutritionGoal: targets.nutritionGoal,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
