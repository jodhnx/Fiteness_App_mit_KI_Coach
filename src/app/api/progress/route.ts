import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { progressEntrySchema } from "@/lib/validations";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { startOfDay } from "date-fns";
import { buildBodyTransformation } from "@/lib/body-transformation";
import { loadProgressDashboardExtras } from "@/lib/progress-dashboard";
import { progressPhotoImageUrl } from "@/lib/progress-photo-storage";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;

    const [entries, photos, profile, firstWeight, dashboard] = await Promise.all([
      prisma.progressEntry.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 120,
        select: {
          id: true,
          date: true,
          weightKg: true,
          waistCm: true,
          chestCm: true,
          hipsCm: true,
          bicepsCm: true,
          thighsCm: true,
          bodyFatPct: true,
        },
      }),
      prisma.progressPhoto.findMany({
        where: { userId },
        orderBy: { takenAt: "desc" },
        take: 12,
        select: {
          id: true,
          imageUrl: true,
          aiAnalysis: true,
          aiProgress: true,
          takenAt: true,
        },
      }),
      prisma.profile.findUnique({
        where: { userId },
        select: { weightKg: true, targetWeightKg: true, targetWeightDate: true },
      }),
      prisma.progressEntry.findFirst({
        where: { userId, weightKg: { not: null } },
        orderBy: { date: "asc" },
        select: { weightKg: true },
      }),
      loadProgressDashboardExtras(userId).catch(() => null),
    ]);

    const entriesMapped = entries.map((e) => ({
      ...e,
      date: e.date.toISOString(),
    }));

    // Private photos are never exposed as a direct storage URL.
    const photosMapped = photos.map((p) => ({
      ...p,
      imageUrl: progressPhotoImageUrl(p.id),
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
      photos: photosMapped,
      profile,
      startWeightKg: firstWeight?.weightKg ?? null,
      transformation,
      dashboard,
    });
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
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
    const day = startOfDay(
      new Date(parsed.data.date ?? new Date().toISOString().slice(0, 10))
    );

    const existing = await prisma.progressEntry.findFirst({
      where: { userId, date: day },
    });

    const data = {
      ...(parsed.data.weightKg != null ? { weightKg: parsed.data.weightKg } : {}),
      ...(parsed.data.bodyFatPct != null ? { bodyFatPct: parsed.data.bodyFatPct } : {}),
      ...(parsed.data.chestCm != null ? { chestCm: parsed.data.chestCm } : {}),
      ...(parsed.data.waistCm != null ? { waistCm: parsed.data.waistCm } : {}),
      ...(parsed.data.hipsCm != null ? { hipsCm: parsed.data.hipsCm } : {}),
      ...(parsed.data.bicepsCm != null ? { bicepsCm: parsed.data.bicepsCm } : {}),
      ...(parsed.data.thighsCm != null ? { thighsCm: parsed.data.thighsCm } : {}),
      ...(parsed.data.notes != null ? { notes: parsed.data.notes } : {}),
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

    return jsonOk({ entry }, existing ? 200 : 201);
  } catch (e) {
    return handleApiError(e);
  }
}
