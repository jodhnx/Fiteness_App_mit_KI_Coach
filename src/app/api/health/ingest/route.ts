import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { ALL_PROVIDER_IDS } from "@/lib/health/providers/registry";
import type { WearableProvider } from "@prisma/client";
import {
  applyHealthDaySnapshot,
  applyWearableWorkout,
} from "@/lib/health/health-merge-service";
import { syncAllWearables } from "@/lib/health/health-sync-service";

const daySchema = z.object({
  date: z.string(),
  steps: z.number().optional(),
  distanceM: z.number().optional(),
  floorsClimbed: z.number().optional(),
  activeMinutes: z.number().optional(),
  caloriesBurned: z.number().optional(),
  activeCalories: z.number().optional(),
  sleepHours: z.number().optional(),
  sleepQuality: z.string().optional(),
  sleepDeepHours: z.number().optional(),
  sleepRemHours: z.number().optional(),
  sleepLightHours: z.number().optional(),
  sleepBedtime: z.string().optional(),
  sleepWakeTime: z.string().optional(),
  restingHeartRate: z.number().optional(),
  avgHeartRate: z.number().optional(),
  maxHeartRate: z.number().optional(),
  bloodOxygen: z.number().optional(),
  bloodPressureSys: z.number().optional(),
  bloodPressureDia: z.number().optional(),
  bodyTempC: z.number().optional(),
  recoveryScore: z.number().optional(),
  trainingReadiness: z.number().optional(),
  weightKg: z.number().optional(),
  bodyFatPct: z.number().optional(),
  muscleMassKg: z.number().optional(),
});

const workoutSchema = z.object({
  externalId: z.string(),
  type: z.string(),
  startedAt: z.string(),
  durationSec: z.number(),
  distanceM: z.number().optional(),
  caloriesBurned: z.number().optional(),
  avgHeartRate: z.number().optional(),
  maxHeartRate: z.number().optional(),
});

const ingestSchema = z.object({
  provider: z.enum(ALL_PROVIDER_IDS as [WearableProvider, ...WearableProvider[]]),
  days: z.array(daySchema).optional(),
  workouts: z.array(workoutSchema).optional(),
  triggerSync: z.boolean().optional(),
});

/** Ingest endpoint for native bridges (Apple Health, Health Connect, Samsung). */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const body = await req.json();
    const parsed = ingestSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Daten");

    const { provider, days, workouts } = parsed.data;
    let importedDays = 0;
    let importedWorkouts = 0;
    let skippedDuplicates = 0;

    for (const day of days ?? []) {
      const { applied, duplicate } = await applyHealthDaySnapshot(
        session.user.id,
        provider,
        day
      );
      if (applied) importedDays++;
      if (duplicate) skippedDuplicates++;
    }

    for (const w of workouts ?? []) {
      const { applied, duplicate } = await applyWearableWorkout(
        session.user.id,
        provider,
        w
      );
      if (applied) importedWorkouts++;
      if (duplicate) skippedDuplicates++;
    }

    if (parsed.data.triggerSync) {
      await syncAllWearables(session.user.id, 1);
    }

    return jsonOk({
      importedDays,
      importedWorkouts,
      skippedDuplicates,
      provider,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
