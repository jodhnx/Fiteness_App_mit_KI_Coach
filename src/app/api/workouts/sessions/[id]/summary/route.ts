import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeWorkoutSession } from "@/lib/workout-session-analysis";
import { setVolume } from "@/lib/workout-metrics";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { subDays } from "date-fns";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;

    const workoutSession = await prisma.workoutSession.findFirst({
      where: { id, userId: session.user.id, status: "COMPLETED" },
      include: {
        sets: { include: { exercise: true } },
      },
    });
    if (!workoutSession) return jsonError("Session nicht gefunden", 404);

    const newPRs = await prisma.personalRecord.findMany({
      where: { userId: session.user.id, sessionId: id },
      include: { exercise: true },
    });

    const weekAgo = subDays(new Date(), 7);
    const weekSets = await prisma.workoutSet.findMany({
      where: {
        completed: true,
        session: {
          userId: session.user.id,
          status: "COMPLETED",
          completedAt: { gte: weekAgo, lt: workoutSession.completedAt ?? new Date() },
        },
      },
    });
    const recentWeeklyVolume = weekSets.reduce(
      (a, s) => a + setVolume(s.reps, s.weightKg),
      0
    );

    const analysis = analyzeWorkoutSession(
      workoutSession.sets,
      workoutSession.durationSec ?? 0,
      newPRs,
      recentWeeklyVolume
    );

    return jsonOk({ session: workoutSession, analysis });
  } catch (e) {
    return handleApiError(e);
  }
}
