import { auth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { loadHomeCriticalData } from "@/lib/home-critical";
import { loadProfilePrefetch } from "@/lib/profile-prefetch";
import { prisma } from "@/lib/prisma";
import { buildBodyTransformation } from "@/lib/body-transformation";

/**
 * Boot payload: Home + Nutrition are critical (splash gate).
 * Profile + lightweight progress run in parallel but progress extras
 * (90-day charts) are deferred — Progress page fetches them on demand.
 */
export async function GET() {
  const started = Date.now();
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;

    // Critical path first — everything needed to dismiss splash
    const homePromise = loadHomeCriticalData(userId);

    // Secondary: profile + slim progress (no 90-day extras on boot)
    const secondaryPromise = Promise.all([
      loadProfilePrefetch(userId).catch(() => null),
      Promise.all([
        prisma.progressEntry.findMany({
          where: { userId },
          orderBy: { date: "desc" },
          take: 30,
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
          take: 4,
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
      ]).catch(() => null),
    ]);

    const [home, secondary] = await Promise.all([homePromise, secondaryPromise]);
    const [profile, progressCore] = secondary;

    let progress = null;
    if (progressCore) {
      const [entries, photos, progressProfile, firstWeight] = progressCore;
      const entriesMapped = entries.map((e) => ({
        ...e,
        date: e.date.toISOString(),
      }));
      progress = {
        entries: entriesMapped,
        photos,
        profile: progressProfile,
        startWeightKg: firstWeight?.weightKg ?? null,
        transformation: buildBodyTransformation(
          firstWeight?.weightKg ?? null,
          progressProfile?.weightKg ?? null,
          progressProfile?.targetWeightKg ?? null,
          progressProfile?.targetWeightDate ?? null,
          entriesMapped
        ),
        // Charts / history extras load on Progress tab (stale-while-revalidate)
        dashboard: null,
      };
    }

    const nutrition = home.nutrition ?? null;

    if (process.env.NODE_ENV === "development") {
      console.info("[api/bootstrap] ok", Date.now() - started, "ms");
    }

    const res = jsonOk({ home, nutrition, profile, progress });
    res.headers.set("Cache-Control", "private, no-cache");
    return res;
  } catch (e) {
    console.error("[api/bootstrap]", e);
    return jsonError("Bootstrap fehlgeschlagen", 500);
  }
}
