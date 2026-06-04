import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { nutritionGoalSchema } from "@/lib/validations";
import { applyNutritionGoal } from "@/lib/nutrition-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        nutritionGoal: true,
        calorieTarget: true,
        proteinTargetG: true,
        carbsTargetG: true,
        fatTargetG: true,
        waterTargetMl: true,
      },
    });
    return jsonOk({ profile });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = nutritionGoalSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const result = await applyNutritionGoal(
      session.user.id,
      parsed.data.nutritionGoal
    );
    if (!result) {
      return jsonError(
        "Profil unvollständig – bitte Alter, Gewicht, Größe, Geschlecht und Aktivität im Profil ausfüllen.",
        400
      );
    }
    if (parsed.data.waterTargetMl) {
      await prisma.profile.update({
        where: { userId: session.user.id },
        data: { waterTargetMl: parsed.data.waterTargetMl },
      });
    }
    return jsonOk({ targets: result });
  } catch (e) {
    return handleApiError(e);
  }
}
