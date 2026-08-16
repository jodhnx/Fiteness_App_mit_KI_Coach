import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { waterLogSchema } from "@/lib/validations";
import { startOfDay } from "date-fns";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { tableExists } from "@/lib/prisma-safe";
import { isSchemaMismatchError } from "@/lib/prisma-errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const dateParam = req.nextUrl.searchParams.get("date");
    const date = dateParam ? startOfDay(new Date(dateParam)) : startOfDay(new Date());
    if (!(await tableExists("WaterLog"))) {
      return jsonOk({ logs: [], totalMl: 0 });
    }
    const logs = await prisma.waterLog.findMany({
      where: { userId: session.user.id, date },
      orderBy: { createdAt: "asc" },
    });
    const totalMl = logs.reduce((s, l) => s + l.amountMl, 0);
    return jsonOk({ logs, totalMl });
  } catch (e) {
    if (isSchemaMismatchError(e)) return jsonOk({ logs: [], totalMl: 0 });
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = waterLogSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");
    const date = startOfDay(
      parsed.data.date ? new Date(parsed.data.date) : new Date()
    );
    if (!(await tableExists("WaterLog"))) {
      return jsonError(
        "Wasser-Tracking ist vorübergehend nicht verfügbar.",
        503
      );
    }
    const log = await prisma.waterLog.create({
      data: {
        userId: session.user.id,
        date,
        amountMl: parsed.data.amountMl,
      },
    });
    const totalMl = await prisma.waterLog.aggregate({
      where: { userId: session.user.id, date },
      _sum: { amountMl: true },
    });
    const dashboard = await loadNutritionDashboard(session.user.id, date);
    return jsonOk(
      { log, totalMl: totalMl._sum.amountMl ?? 0, dashboard },
      201
    );
  } catch (e) {
    if (isSchemaMismatchError(e)) {
      return jsonError("Wasser-Tracking ist vorübergehend nicht verfügbar.", 503);
    }
    return handleApiError(e);
  }
}
