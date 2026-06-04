import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { addDays, startOfWeek, format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 7);

    const completed = await prisma.workoutSession.findMany({
      where: {
        userId: session.user.id,
        status: "COMPLETED",
        completedAt: { gte: weekStart, lt: weekEnd },
      },
      select: { id: true, name: true, completedAt: true, durationSec: true },
      orderBy: { completedAt: "asc" },
    });

    const activePlan = await prisma.workoutPlan.findFirst({
      where: { userId: session.user.id, archivedAt: null, isActive: true },
      include: {
        days: { orderBy: { dayOrder: "asc" }, include: { _count: { select: { exercises: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const lastSession = await prisma.workoutSession.findFirst({
      where: { userId: session.user.id, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
    });

    const upcoming = activePlan
      ? activePlan.days.map((day, i) => {
          const suggested = addDays(weekStart, i % 7);
          return {
            planId: activePlan.id,
            dayId: day.id,
            planName: activePlan.name,
            dayName: day.name,
            exerciseCount: day._count.exercises,
            suggestedDate: format(suggested, "yyyy-MM-dd"),
          };
        })
      : [];

    return jsonOk({
      weekStart: weekStart.toISOString(),
      completed,
      upcoming,
      lastWorkoutAt: lastSession?.completedAt ?? null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
