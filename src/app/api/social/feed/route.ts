import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { subDays } from "date-fns";

export type SocialFeedItem = {
  id: string;
  type: "workout" | "achievement" | "streak" | "pr";
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
  title: string;
  subtitle?: string;
  meta?: string;
};

/** Activity feed from friends + self (real data only). */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;
    const since = subDays(new Date(), 21);

    const friendships = await prisma.friend.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ initiatorId: userId }, { receiverId: userId }],
      },
      select: { initiatorId: true, receiverId: true },
    });

    const friendIds = friendships.map((f) =>
      f.initiatorId === userId ? f.receiverId : f.initiatorId
    );
    const scopeIds = [userId, ...friendIds];

    const users = await prisma.user.findMany({
      where: { id: { in: scopeIds } },
      select: { id: true, name: true, username: true, image: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    const [sessions, achievements, prs] = await Promise.all([
      prisma.workoutSession.findMany({
        where: {
          userId: { in: scopeIds },
          status: "COMPLETED",
          completedAt: { gte: since },
        },
        orderBy: { completedAt: "desc" },
        take: 40,
        select: {
          id: true,
          name: true,
          completedAt: true,
          durationSec: true,
          userId: true,
          _count: { select: { sets: true } },
        },
      }),
      prisma.userAchievement.findMany({
        where: { userId: { in: scopeIds }, earnedAt: { gte: since } },
        orderBy: { earnedAt: "desc" },
        take: 20,
        include: {
          achievement: { select: { name: true, icon: true } },
        },
      }),
      prisma.personalRecord.findMany({
        where: { userId: { in: scopeIds }, achievedAt: { gte: since } },
        orderBy: { achievedAt: "desc" },
        take: 15,
        include: {
          exercise: { select: { name: true } },
        },
      }),
    ]);

    const items: SocialFeedItem[] = [];

    for (const s of sessions) {
      if (!s.completedAt) continue;
      const u = userById.get(s.userId);
      if (!u) continue;
      const mins = s.durationSec ? Math.round(s.durationSec / 60) : null;
      items.push({
        id: `workout-${s.id}`,
        type: "workout",
        createdAt: s.completedAt.toISOString(),
        user: u,
        title: "Workout abgeschlossen",
        subtitle: s.name || "Training",
        meta: [
          s._count.sets > 0 ? `${s._count.sets} Sätze` : null,
          mins != null ? `${mins} Min` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }

    for (const a of achievements) {
      const u = userById.get(a.userId);
      if (!u) continue;
      items.push({
        id: `ach-${a.id}`,
        type: "achievement",
        createdAt: a.earnedAt.toISOString(),
        user: u,
        title: "Erfolg freigeschaltet",
        subtitle: `${a.achievement.icon ?? "🏆"} ${a.achievement.name}`,
      });
    }

    for (const pr of prs) {
      const u = userById.get(pr.userId);
      if (!u) continue;
      items.push({
        id: `pr-${pr.id}`,
        type: "pr",
        createdAt: pr.achievedAt.toISOString(),
        user: u,
        title: "Persönlicher Rekord",
        subtitle: pr.exercise.name,
        meta:
          pr.weightKg != null
            ? `${pr.weightKg} kg`
            : pr.value != null
              ? String(pr.value)
              : undefined,
      });
    }

    items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return jsonOk({ feed: items.slice(0, 50) });
  } catch (e) {
    return handleApiError(e);
  }
}
