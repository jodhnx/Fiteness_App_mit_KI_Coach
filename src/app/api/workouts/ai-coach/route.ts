import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion, COACH_SYSTEM_PROMPT } from "@/lib/openai";
import { setVolume } from "@/lib/workout-metrics";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { subDays } from "date-fns";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const since = subDays(new Date(), 28);
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId: session.user.id,
        status: "COMPLETED",
        completedAt: { gte: since },
      },
      include: { sets: true },
      orderBy: { completedAt: "desc" },
    });

    let totalVolume = 0;
    const muscleVol: Record<string, number> = {};
    for (const s of sessions) {
      for (const set of s.sets) {
        const v = setVolume(set.reps, set.weightKg);
        totalVolume += v;
        if (set.exerciseLibraryId) {
          const ex = await prisma.exerciseLibrary.findUnique({
            where: { id: set.exerciseLibraryId },
            select: { muscleGroup: true, name: true },
          });
          if (ex) muscleVol[ex.muscleGroup] = (muscleVol[ex.muscleGroup] ?? 0) + v;
        }
      }
    }

    const streak = await prisma.trainingStreak.findUnique({
      where: { userId: session.user.id },
    });
    const prs = await prisma.personalRecord.findMany({
      where: { userId: session.user.id },
      take: 10,
      orderBy: { achievedAt: "desc" },
      include: { exercise: true },
    });

    const context = JSON.stringify({
      sessionsLast4Weeks: sessions.length,
      totalVolume,
      muscleVolume: muscleVol,
      streak,
      recentPRs: prs.map((p) => ({
        exercise: p.exercise.name,
        type: p.recordType,
        value: p.value,
      })),
    });

    const { content } = await chatCompletion(
      [
        { role: "system", content: COACH_SYSTEM_PROMPT },
        {
          role: "system",
          content: `Analysiere diese Trainingsdaten der letzten 4 Wochen und gib auf Deutsch konkrete Empfehlungen (Volumen, Deload, Übungswechsel, Muskelbalance, Frequenz). Max 400 Wörter. Daten: ${context}`,
        },
        {
          role: "user",
          content:
            "Analysiere mein Training und gib mir konkrete Empfehlungen für die nächsten 2 Wochen.",
        },
      ],
      session.user.id
    );

    await prisma.aIRecommendation.create({
      data: {
        userId: session.user.id,
        type: "WORKOUT_ANALYSIS",
        title: "KI Trainingsanalyse",
        content,
      },
    });

    return jsonOk({ analysis: content, stats: { sessions: sessions.length, totalVolume } });
  } catch (e) {
    console.error("WORKOUT AI ERROR:", e);
    return handleApiError(e);
  }
}
