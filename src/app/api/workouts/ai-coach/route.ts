import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion, COACH_SYSTEM_PROMPT } from "@/lib/openai";
import { setVolume } from "@/lib/workout-metrics";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { aiLimitExceededResponse } from "@/lib/security/ai-rate-limit";
import { subDays } from "date-fns";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const limited = await aiLimitExceededResponse(session.user.id, ["ai-coach"], 8);
    if (limited) return limited;

    const since = subDays(new Date(), 28);
    const [sessions, streak, prs] = await Promise.all([
      prisma.workoutSession.findMany({
        where: {
          userId: session.user.id,
          status: "COMPLETED",
          completedAt: { gte: since },
        },
        select: {
          sets: {
            where: { completed: true },
            select: {
              reps: true,
              weightKg: true,
              exerciseLibraryId: true,
            },
          },
        },
        orderBy: { completedAt: "desc" },
        take: 40,
      }),
      prisma.trainingStreak.findUnique({
        where: { userId: session.user.id },
        select: { currentDays: true, longestDays: true },
      }),
      prisma.personalRecord.findMany({
        where: { userId: session.user.id },
        take: 8,
        orderBy: { achievedAt: "desc" },
        select: {
          recordType: true,
          value: true,
          exercise: { select: { name: true } },
        },
      }),
    ]);

    const libraryIds = [
      ...new Set(
        sessions.flatMap((s) =>
          s.sets
            .map((set) => set.exerciseLibraryId)
            .filter((id): id is string => Boolean(id))
        )
      ),
    ];
    const exercises =
      libraryIds.length > 0
        ? await prisma.exerciseLibrary.findMany({
            where: { id: { in: libraryIds } },
            select: { id: true, muscleGroup: true },
          })
        : [];
    const muscleById = new Map(exercises.map((ex) => [ex.id, ex.muscleGroup]));

    let totalVolume = 0;
    const muscleVol: Record<string, number> = {};
    for (const s of sessions) {
      for (const set of s.sets) {
        const v = setVolume(set.reps, set.weightKg);
        totalVolume += v;
        if (set.exerciseLibraryId) {
          const muscle = muscleById.get(set.exerciseLibraryId);
          if (muscle) muscleVol[muscle] = (muscleVol[muscle] ?? 0) + v;
        }
      }
    }

    const context = JSON.stringify({
      sessionsLast4Weeks: sessions.length,
      totalVolume: Math.round(totalVolume),
      muscleVolume: muscleVol,
      streakDays: streak?.currentDays ?? 0,
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
          content: `Analysiere diese Trainingsdaten der letzten 4 Wochen und gib auf Deutsch konkrete Empfehlungen (Volumen, Deload, Übungswechsel, Muskelbalance, Frequenz). Max 250 Wörter. Daten: ${context}`,
        },
        {
          role: "user",
          content:
            "Analysiere mein Training und gib mir konkrete Empfehlungen für die nächsten 2 Wochen.",
        },
      ],
      session.user.id,
      { maxTokens: 700, endpoint: "ai-coach" }
    );

    await prisma.aIRecommendation.create({
      data: {
        userId: session.user.id,
        type: "WORKOUT_ANALYSIS",
        title: "KI Trainingsanalyse",
        content,
      },
    });

    return jsonOk({
      analysis: content,
      stats: { sessions: sessions.length, totalVolume: Math.round(totalVolume) },
    });
  } catch (e) {
    console.error("WORKOUT AI ERROR:", e);
    return handleApiError(e);
  }
}
