import { auth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { loadHomeCriticalData } from "@/lib/home-critical";
import { loadProfilePrefetch } from "@/lib/profile-prefetch";
import { prisma } from "@/lib/prisma";
import { loadProgressDashboardExtras } from "@/lib/progress-dashboard";
import { buildBodyTransformation } from "@/lib/body-transformation";

/** Single round-trip boot payload — replaces 4 parallel client fetches. */
export async function GET() {
  const started = Date.now();
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;

    const [home, profile, progressCore] = await Promise.all([
      loadHomeCriticalData(userId),
      loadProfilePrefetch(userId),
      Promise.all([
        prisma.progressEntry.findMany({
          where: { userId },
          orderBy: { date: "desc" },
          take: 60,
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
          take: 8,
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
      ]),
    ]);

    const [entries, photos, progressProfile, firstWeight, dashboard] = progressCore;
    const entriesMapped = entries.map((e) => ({
      ...e,
      date: e.date.toISOString(),
    }));

    const progress = {
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
      dashboard,
    };

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
