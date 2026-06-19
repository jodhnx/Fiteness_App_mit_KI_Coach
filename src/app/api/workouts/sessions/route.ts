import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { awardXP, checkAndAwardAchievements } from "@/lib/gamification";
import { updateTrainingStreak } from "@/lib/workout-plans";
import { computePRUpdates, sessionDurationSec, setVolume } from "@/lib/workout-metrics";
import { parsePlanSetTargets } from "@/lib/plan-exercise-sets";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

const startSchema = z.object({
  workoutPlanId: z.string().optional(),
  workoutDayId: z.string().optional(),
  name: z.string().min(1),
  duplicateSessionId: z.string().optional(),
});

const setSchema = z.object({
  exerciseLibraryId: z.string().optional(),
  exerciseName: z.string(),
  setNumber: z.number().int().positive(),
  reps: z.number().int().nonnegative().optional(),
  weightKg: z.number().nonnegative().optional(),
  rpe: z.number().min(0).max(10).optional(),
  restSeconds: z.number().int().nonnegative().optional(),
  durationSec: z.number().int().nonnegative().optional(),
  completed: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const activeOnly = req.nextUrl.searchParams.get("active") === "1";

    if (activeOnly) {
      const active = await prisma.workoutSession.findFirst({
        where: { userId: session.user.id, status: "IN_PROGRESS" },
        include: {
          sets: { orderBy: [{ exerciseName: "asc" }, { setNumber: "asc" }] },
          plan: true,
          day: { include: { exercises: { include: { exercise: true } } } },
        },
      });
      return jsonOk({ session: active });
    }

    const sessions = await prisma.workoutSession.findMany({
      where: { userId: session.user.id },
      include: {
        sets: true,
        plan: true,
        day: true,
      },
      orderBy: { startedAt: "desc" },
      take: 100,
    });
    return jsonOk({ sessions });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();

    if (body.action === "start") {
      const parsed = startSchema.safeParse(body);
      if (!parsed.success) return jsonError("Ungültige Eingabe");

      const existing = await prisma.workoutSession.findFirst({
        where: { userId: session.user.id, status: "IN_PROGRESS" },
      });
      if (existing) {
        return jsonOk({ session: existing, resumed: true });
      }

      let initialSets: z.infer<typeof setSchema>[] = [];

      if (parsed.data.duplicateSessionId) {
        const prev = await prisma.workoutSession.findFirst({
          where: { id: parsed.data.duplicateSessionId, userId: session.user.id },
          include: { sets: true },
        });
        if (prev) {
          initialSets = prev.sets.map((s) => ({
            exerciseLibraryId: s.exerciseLibraryId ?? undefined,
            exerciseName: s.exerciseName,
            setNumber: s.setNumber,
            reps: s.reps ?? 0,
            weightKg: s.weightKg ?? 0,
            rpe: s.rpe ?? undefined,
            restSeconds: s.restSeconds ?? 90,
            completed: false,
          }));
        }
      } else if (parsed.data.workoutDayId) {
        const day = await prisma.workoutDay.findFirst({
          where: {
            id: parsed.data.workoutDayId,
            plan: { userId: session.user.id },
          },
          include: { exercises: { include: { exercise: true }, orderBy: { orderIndex: "asc" } } },
        });
        if (day) {
          for (const ex of day.exercises) {
            const planSets = parsePlanSetTargets(
              ex.setTargets,
              ex.targetSets,
              ex.targetReps
            );
            const setCount = Math.max(planSets.length, ex.targetSets, 1);

            const lastSessionSets = await prisma.workoutSet.findMany({
              where: {
                exerciseLibraryId: ex.exerciseLibraryId,
                session: { userId: session.user.id, status: "COMPLETED" },
              },
              orderBy: [{ session: { completedAt: "desc" } }, { setNumber: "asc" }],
              take: setCount,
            });

            if (lastSessionSets.length > 0) {
              for (let i = 0; i < setCount; i++) {
                const ls = lastSessionSets[i];
                const planRow = planSets[i];
                initialSets.push({
                  exerciseLibraryId: ex.exerciseLibraryId,
                  exerciseName: ex.exercise.name,
                  setNumber: i + 1,
                  reps: ls?.reps ?? planRow?.reps ?? 10,
                  weightKg: ls?.weightKg ?? planRow?.weightKg ?? 0,
                  restSeconds: ex.restSeconds,
                  completed: false,
                });
              }
            } else {
              for (let i = 0; i < setCount; i++) {
                const planRow = planSets[i];
                initialSets.push({
                  exerciseLibraryId: ex.exerciseLibraryId,
                  exerciseName: ex.exercise.name,
                  setNumber: i + 1,
                  reps: planRow?.reps ?? 10,
                  weightKg: planRow?.weightKg ?? 0,
                  restSeconds: ex.restSeconds,
                  completed: false,
                });
              }
            }
          }
        }
      }

      const workoutSession = await prisma.workoutSession.create({
        data: {
          userId: session.user.id,
          workoutPlanId: parsed.data.workoutPlanId,
          workoutDayId: parsed.data.workoutDayId,
          name: parsed.data.name,
          status: "IN_PROGRESS",
          sets: initialSets.length
            ? { create: initialSets.map((s) => ({ ...s, completed: false })) }
            : undefined,
        },
        include: {
          sets: { orderBy: [{ exerciseName: "asc" }, { setNumber: "asc" }] },
          day: { include: { exercises: { include: { exercise: true } } } },
        },
      });

      return jsonOk({ session: workoutSession }, 201);
    }

    return jsonError("Unbekannte Aktion", 400);
  } catch (e) {
    console.error("SESSION START ERROR:", e);
    return handleApiError(e);
  }
}
