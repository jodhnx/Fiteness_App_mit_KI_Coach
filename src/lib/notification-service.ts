import { prisma } from "@/lib/prisma";
import { startOfDay, subDays } from "date-fns";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { mapNotificationCategory, type AppNotification } from "@/lib/notification-types";

async function existsRecent(userId: string, title: string) {
  const since = subDays(new Date(), 1);
  const row = await prisma.notification.findFirst({
    where: { userId, title, createdAt: { gte: since } },
    select: { id: true },
  });
  return Boolean(row);
}

export async function syncUserNotifications(userId: string): Promise<void> {
  const today = startOfDay(new Date());

  const [trainingStreak, latestAchievement, latestWeight, nutrition, coachMessage] =
    await Promise.all([
      prisma.trainingStreak.findUnique({ where: { userId } }),
      prisma.userAchievement.findFirst({
        where: { userId },
        orderBy: { earnedAt: "desc" },
        include: { achievement: { select: { name: true } } },
      }),
      prisma.progressEntry.findFirst({
        where: { userId, weightKg: { not: null } },
        orderBy: { date: "desc" },
        select: { weightKg: true, date: true },
      }),
      loadNutritionDashboard(userId, today).catch(() => null),
      prisma.aIChatMessage.findFirst({
        where: { chat: { userId }, role: "assistant" },
        orderBy: { createdAt: "desc" },
        select: { content: true, createdAt: true },
      }),
    ]);

  if (trainingStreak && trainingStreak.currentDays >= 3) {
    const title = "Trainingsstreak erreicht";
    if (!(await existsRecent(userId, title))) {
      await prisma.notification.create({
        data: {
          userId,
          type: "REMINDER",
          title,
          message: `${trainingStreak.currentDays} Tage in Folge — weiter so!`,
          link: "/workouts/journey",
        },
      });
    }
  }

  if (latestAchievement && latestAchievement.earnedAt >= subDays(new Date(), 7)) {
    const title = "Neues Achievement freigeschaltet";
    if (!(await existsRecent(userId, title))) {
      await prisma.notification.create({
        data: {
          userId,
          type: "ACHIEVEMENT",
          title,
          message: latestAchievement.achievement.name,
          link: "/erfolge",
        },
      });
    }
  }

  if (nutrition) {
    const calOk = nutrition.consumed.calories >= nutrition.targets.calories * 0.95;
    const proOk = nutrition.consumed.proteinG >= nutrition.targets.proteinG * 0.95;

    if (calOk && nutrition.targets.calories > 0) {
      const title = "Kalorienziel erreicht";
      if (!(await existsRecent(userId, title))) {
        await prisma.notification.create({
          data: {
            userId,
            type: "REMINDER",
            title,
            message: "Dein Tagesziel ist im grünen Bereich.",
            link: "/nutrition",
          },
        });
      }
    }
    if (proOk && nutrition.targets.proteinG > 0) {
      const title = "Proteinziel erreicht";
      if (!(await existsRecent(userId, title))) {
        await prisma.notification.create({
          data: {
            userId,
            type: "REMINDER",
            title,
            message: `Proteinziel mit ${Math.round(nutrition.consumed.proteinG)}g erreicht.`,
            link: "/nutrition",
          },
        });
      }
    }
  }

  if (latestWeight?.date && latestWeight.date >= subDays(new Date(), 3)) {
    const title = "Gewicht aktualisiert";
    if (!(await existsRecent(userId, title))) {
      await prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title,
          message: latestWeight.weightKg
            ? `Aktuell ${latestWeight.weightKg.toLocaleString("de-DE")} kg`
            : "Neuer Gewichtseintrag gespeichert.",
          link: "/progress",
        },
      });
    }
  }

  if (coachMessage?.createdAt && coachMessage.createdAt >= subDays(new Date(), 2)) {
    const title = "Coach Empfehlung";
    if (!(await existsRecent(userId, title))) {
      const snippet = coachMessage.content.slice(0, 120).trim();
      await prisma.notification.create({
        data: {
          userId,
          type: "REMINDER",
          title,
          message: snippet || "Neuer Tipp von deinem KI Coach.",
          link: "/coach",
        },
      });
    }
  }
}

export async function loadUserNotifications(userId: string): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
}> {
  await syncUserNotifications(userId).catch(() => {});

  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const notifications: AppNotification[] = rows.map((n) => ({
    id: n.id,
    category: mapNotificationCategory(n.type, n.title, n.link),
    title: n.title,
    message: n.message,
    read: n.read,
    link: n.link,
    createdAt: n.createdAt.toISOString(),
  }));

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
  };
}

export async function markNotificationRead(userId: string, id: string) {
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
