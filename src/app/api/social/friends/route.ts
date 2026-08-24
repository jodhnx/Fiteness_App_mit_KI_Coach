import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { friendRequestSchema } from "@/lib/validations";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { normalizeUsername } from "@/lib/username";
import { compactPublicAvatar } from "@/lib/public-avatar";

const userPublicSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
} as const;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;
    const q = req.nextUrl.searchParams.get("q")?.trim();

    // Username search for adding friends
    if (q && q.length >= 2) {
      const needle = normalizeUsername(q);
      const users = await prisma.user.findMany({
        where: {
          AND: [
            { id: { not: userId } },
            { isGuest: false },
            {
              OR: [
                { username: { contains: needle, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
              ],
            },
          ],
        },
        select: userPublicSelect,
        take: 12,
      });

      const achievements = await prisma.userAchievement.findMany({
        where: { userId: { in: users.map((u) => u.id) } },
        include: { achievement: { select: { name: true, icon: true } } },
        take: 40,
      });
      const byUser = new Map<string, { name: string; icon: string | null }[]>();
      for (const a of achievements) {
        const list = byUser.get(a.userId) ?? [];
        if (list.length < 3) {
          list.push({
            name: a.achievement.name,
            icon: a.achievement.icon ?? null,
          });
        }
        byUser.set(a.userId, list);
      }

      return jsonOk({
        users: users.map((u) => ({
          ...u,
          image: compactPublicAvatar(u.image),
          publicAchievements: byUser.get(u.id) ?? [],
        })),
      });
    }

    const friends = await prisma.friend.findMany({
      where: {
        OR: [{ initiatorId: userId }, { receiverId: userId }],
      },
      include: {
        initiator: { select: userPublicSelect },
        receiver: { select: userPublicSelect },
      },
      orderBy: { updatedAt: "desc" },
    });

    const friendIds = friends
      .filter((f) => f.status === "ACCEPTED")
      .map((f) => (f.initiatorId === userId ? f.receiverId : f.initiatorId));

    const achievements = friendIds.length
      ? await prisma.userAchievement.findMany({
          where: { userId: { in: friendIds } },
          include: { achievement: { select: { name: true, icon: true } } },
        })
      : [];

    const achByUser = new Map<string, { name: string; icon: string | null }[]>();
    for (const a of achievements) {
      const list = achByUser.get(a.userId) ?? [];
      if (list.length < 3) {
        list.push({
          name: a.achievement.name,
          icon: a.achievement.icon ?? null,
        });
      }
      achByUser.set(a.userId, list);
    }

    return jsonOk({
      friends: friends.map((f) => {
        const other = f.initiatorId === userId ? f.receiver : f.initiator;
        const compactUser = (u: typeof other) => ({
          ...u,
          image: compactPublicAvatar(u.image),
        });
        return {
          ...f,
          initiator: compactUser(f.initiator),
          receiver: compactUser(f.receiver),
          other: compactUser(other),
          publicAchievements: achByUser.get(other.id) ?? [],
        };
      }),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = friendRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Ungültiger Benutzername oder E-Mail");
    }

    let receiver =
      parsed.data.username != null
        ? await prisma.user.findUnique({
            where: { username: normalizeUsername(parsed.data.username) },
          })
        : null;

    if (!receiver && parsed.data.email) {
      receiver = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase().trim() },
      });
    }

    if (!receiver) return jsonError("Nutzer nicht gefunden");
    if (receiver.id === session.user.id) {
      return jsonError("Du kannst dich nicht selbst hinzufügen");
    }

    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { initiatorId: session.user.id, receiverId: receiver.id },
          { initiatorId: receiver.id, receiverId: session.user.id },
        ],
      },
    });
    if (existing) {
      if (existing.status === "ACCEPTED") {
        return jsonError("Ihr seid bereits Freunde");
      }
      return jsonError("Anfrage existiert bereits");
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, name: true },
    });

    const friend = await prisma.friend.create({
      data: {
        initiatorId: session.user.id,
        receiverId: receiver.id,
        status: "PENDING",
      },
    });

    const fromLabel = me?.username ? `@${me.username}` : me?.name ?? "Jemand";
    await prisma.notification.create({
      data: {
        userId: receiver.id,
        type: "FRIEND_REQUEST",
        title: "Neue Freundschaftsanfrage",
        message: `${fromLabel} möchte dich als Freund hinzufügen`,
        link: "/social",
      },
    });

    return jsonOk({ friend }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id, action } = await req.json();
    const friend = await prisma.friend.findFirst({
      where: {
        id,
        OR: [
          { receiverId: session.user.id },
          { initiatorId: session.user.id },
        ],
      },
    });
    if (!friend) return jsonError("Anfrage nicht gefunden");

    if (action === "accept") {
      if (friend.receiverId !== session.user.id) {
        return jsonError("Nur der Empfänger kann annehmen", 403);
      }
      await prisma.friend.update({
        where: { id },
        data: { status: "ACCEPTED" },
      });
    } else if (action === "reject") {
      if (friend.receiverId !== session.user.id) {
        return jsonError("Nur der Empfänger kann ablehnen", 403);
      }
      await prisma.friend.delete({ where: { id } });
    } else if (action === "remove" || action === "cancel") {
      await prisma.friend.delete({ where: { id } });
    } else {
      return jsonError("Ungültige Aktion");
    }
    return jsonOk({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return jsonError("id fehlt");
    const friend = await prisma.friend.findFirst({
      where: {
        id,
        OR: [
          { initiatorId: session.user.id },
          { receiverId: session.user.id },
        ],
      },
    });
    if (!friend) return jsonError("Nicht gefunden", 404);
    await prisma.friend.delete({ where: { id } });
    return jsonOk({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}
