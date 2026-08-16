import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { subDays } from "date-fns";

/** Leaderboard from real friend+self activity (no fake values). */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;
    const url = new URL(req.url);
    const metric = url.searchParams.get("metric") ?? "workouts";

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

    const since = subDays(new Date(), 30);
    const rows: {
      userId: string;
      value: number;
      user: (typeof users)[0];
    }[] = [];

    if (metric === "steps") {
      const metrics = await prisma.dailyHealthMetric
        .findMany({
          where: { userId: { in: scopeIds }, date: { gte: since } },
          select: { userId: true, steps: true },
        })
        .catch(() => []);
      const byUser = new Map<string, number>();
      for (const m of metrics) {
        byUser.set(m.userId, (byUser.get(m.userId) ?? 0) + m.steps);
      }
      for (const u of users) {
        rows.push({ userId: u.id, value: byUser.get(u.id) ?? 0, user: u });
      }
    } else if (metric === "streak") {
      const streaks = await prisma.streak
        .findMany({
          where: { userId: { in: scopeIds } },
          select: { userId: true, currentDays: true },
        })
        .catch(() => []);
      const byUser = new Map(streaks.map((s) => [s.userId, s.currentDays]));
      for (const u of users) {
        rows.push({ userId: u.id, value: byUser.get(u.id) ?? 0, user: u });
      }
    } else {
      // workouts (default)
      const counts = await prisma.workoutSession.groupBy({
        by: ["userId"],
        where: {
          userId: { in: scopeIds },
          status: "COMPLETED",
          completedAt: { gte: since },
        },
        _count: { _all: true },
      });
      const byUser = new Map(counts.map((c) => [c.userId, c._count._all]));
      for (const u of users) {
        rows.push({ userId: u.id, value: byUser.get(u.id) ?? 0, user: u });
      }
    }

    rows.sort((a, b) => b.value - a.value);

    return jsonOk({
      metric,
      leaderboard: rows.map((r, i) => ({
        rank: i + 1,
        value: r.value,
        isMe: r.userId === userId,
        user: r.user,
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
