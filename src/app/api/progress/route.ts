import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { progressEntrySchema } from "@/lib/validations";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { startOfDay } from "date-fns";
import { buildProgressInsights } from "@/lib/progress-insights";
import { buildBodyTransformation } from "@/lib/body-transformation";
import { buildWeeklyReport } from "@/lib/weekly-report";
import { invalidateCache } from "@/lib/client-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;

    const [entries, photos, insights, profile, firstWeight, weeklyReport] = await Promise.all([
      prisma.progressEntry.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 400,
        select: { id: true, date: true, weightKg: true, waistCm: true },
      }),
      prisma.progressPhoto.findMany({
        where: { userId },
        orderBy: { takenAt: "desc" },
        take: 20,
        select: {
          id: true,
          imageUrl: true,
          aiAnalysis: true,
          aiProgress: true,
          takenAt: true,
        },
      }),
      buildProgressInsights(userId),
      prisma.profile.findUnique({
        where: { userId },
        select: { weightKg: true, targetWeightKg: true, targetWeightDate: true },
      }),
      prisma.progressEntry.findFirst({
        where: { userId, weightKg: { not: null } },
        orderBy: { date: "asc" },
        select: { weightKg: true },
      }),
      buildWeeklyReport(userId).catch(() => null),
    ]);

    const entriesMapped = entries.map((e) => ({
      ...e,
      date: e.date.toISOString(),
    }));

    const transformation = buildBodyTransformation(
      firstWeight?.weightKg ?? null,
      profile?.weightKg ?? null,
      profile?.targetWeightKg ?? null,
      profile?.targetWeightDate ?? null,
      entriesMapped
    );

    const res = jsonOk({
      entries: entriesMapped,
      photos,
      insights,
      profile,
      startWeightKg: firstWeight?.weightKg ?? null,
      transformation,
      weeklyReport,
    });
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = progressEntrySchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const userId = session.user.id;
    const day = startOfDay(new Date(parsed.data.date));

    const existing = await prisma.progressEntry.findFirst({
      where: { userId, date: day },
    });

    const data = {
      weightKg: parsed.data.weightKg,
      bodyFatPct: parsed.data.bodyFatPct,
      chestCm: parsed.data.chestCm,
      waistCm: parsed.data.waistCm,
      hipsCm: parsed.data.hipsCm,
      bicepsCm: parsed.data.bicepsCm,
      thighsCm: parsed.data.thighsCm,
      notes: parsed.data.notes,
    };

    const entry = existing
      ? await prisma.progressEntry.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.progressEntry.create({
          data: { userId, date: day, ...data },
        });

    if (parsed.data.weightKg) {
      await prisma.profile.update({
        where: { userId },
        data: { weightKg: parsed.data.weightKg },
      });
      const { awardXPForAction } = await import("@/lib/gamification");
      await awardXPForAction(userId, "WEIGHT_LOGGED");
    }

    invalidateCache(PROGRESS_CACHE_KEY);
    invalidateCache("home-data");

    return jsonOk({ entry }, existing ? 200 : 201);
  } catch (e) {
    return handleApiError(e);
  }
}
