import { prisma } from "@/lib/prisma";
import type { WearableProvider, EnduranceActivityType } from "@prisma/client";
import { startOfDay, parseISO } from "date-fns";
import type { HealthDaySnapshot, WearableWorkoutSnapshot } from "@/lib/health/types";
import {
  getHealthSyncPreferences,
  isCategoryEnabled,
  isSyncRecordNew,
  markSyncRecord,
} from "@/lib/health/health-sync-preferences";
import { estimateStepCalories } from "@/lib/activity-health";

function mapWorkoutType(type: string): EnduranceActivityType {
  const t = type.toUpperCase();
  if (t.includes("RUN")) return "RUNNING";
  if (t.includes("JOG")) return "JOGGING";
  if (t.includes("CYCL") || t.includes("BIKE")) return "CYCLING";
  if (t.includes("HIKE") || t.includes("WALK")) return "HIKING";
  if (t.includes("SWIM")) return "SWIMMING";
  if (t.includes("ROW")) return "ROWING";
  if (t.includes("WALK")) return "WALKING";
  return "OTHER";
}

function mergeSources(existing: string | null | undefined, provider: WearableProvider): string {
  try {
    const arr = existing ? (JSON.parse(existing) as string[]) : [];
    if (!arr.includes(provider)) arr.push(provider);
    return JSON.stringify(arr);
  } catch {
    return JSON.stringify([provider]);
  }
}

export async function applyHealthDaySnapshot(
  userId: string,
  provider: WearableProvider,
  day: HealthDaySnapshot
): Promise<{ applied: boolean; duplicate: boolean }> {
  const prefs = await getHealthSyncPreferences(userId);
  const recordKey = `day:${day.date}`;
  const isNew = await isSyncRecordNew(userId, provider, recordKey);
  if (!isNew) return { applied: false, duplicate: true };

  const date = startOfDay(parseISO(day.date));
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { weightKg: true, bodyFatPct: true, muscleMassKg: true },
  });

  const existing = await prisma.dailyHealthMetric.findUnique({
    where: { userId_date: { userId, date } },
  });

  const steps = isCategoryEnabled(prefs, "steps")
    ? Math.max(existing?.steps ?? 0, day.steps ?? 0)
    : existing?.steps ?? 0;

  const distanceM = isCategoryEnabled(prefs, "distance")
    ? Math.max(existing?.distanceM ?? 0, day.distanceM ?? 0)
    : existing?.distanceM ?? 0;

  const floorsClimbed = isCategoryEnabled(prefs, "floors")
    ? Math.max(existing?.floorsClimbed ?? 0, day.floorsClimbed ?? 0)
    : existing?.floorsClimbed ?? null;

  const activeMinutes = isCategoryEnabled(prefs, "activeMinutes")
    ? Math.max(existing?.activeMinutes ?? 0, day.activeMinutes ?? 0)
    : existing?.activeMinutes ?? 0;

  let caloriesBurned = existing?.caloriesBurned ?? 0;
  if (isCategoryEnabled(prefs, "calories")) {
    const stepCal = estimateStepCalories(steps, profile?.weightKg ?? null);
    const activeCal = day.activeCalories ?? day.caloriesBurned ?? 0;
    caloriesBurned = Math.max(caloriesBurned, stepCal + activeCal);
  }

  const sleepPatch = isCategoryEnabled(prefs, "sleep")
    ? {
        sleepHours: day.sleepHours ?? existing?.sleepHours,
        sleepQuality: day.sleepQuality ?? existing?.sleepQuality,
        sleepDeepHours: day.sleepDeepHours ?? existing?.sleepDeepHours,
        sleepRemHours: day.sleepRemHours ?? existing?.sleepRemHours,
        sleepLightHours: day.sleepLightHours ?? existing?.sleepLightHours,
        sleepBedtime: day.sleepBedtime ? new Date(day.sleepBedtime) : existing?.sleepBedtime,
        sleepWakeTime: day.sleepWakeTime ? new Date(day.sleepWakeTime) : existing?.sleepWakeTime,
      }
    : {};

  const hrPatch = isCategoryEnabled(prefs, "heartRate")
    ? {
        restingHeartRate: day.restingHeartRate ?? existing?.restingHeartRate,
        avgHeartRate: day.avgHeartRate ?? existing?.avgHeartRate,
        maxHeartRate: Math.max(existing?.maxHeartRate ?? 0, day.maxHeartRate ?? 0) || null,
      }
    : {};

  const vitalsPatch = {
    ...(isCategoryEnabled(prefs, "bloodOxygen") && day.bloodOxygen != null
      ? { bloodOxygen: day.bloodOxygen }
      : {}),
    ...(isCategoryEnabled(prefs, "bloodPressure") && day.bloodPressureSys != null
      ? { bloodPressureSys: day.bloodPressureSys, bloodPressureDia: day.bloodPressureDia }
      : {}),
    ...(isCategoryEnabled(prefs, "bodyTemp") && day.bodyTempC != null
      ? { bodyTempC: day.bodyTempC }
      : {}),
  };

  const recoveryPatch = {
    recoveryScore: day.recoveryScore ?? existing?.recoveryScore,
    trainingReadiness: day.trainingReadiness ?? existing?.trainingReadiness,
    recoveryRating:
      day.recoveryScore != null
        ? day.recoveryScore >= 70
          ? "high"
          : day.recoveryScore >= 40
            ? "medium"
            : "low"
        : existing?.recoveryRating,
  };

  await prisma.dailyHealthMetric.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      steps,
      distanceM,
      floorsClimbed: floorsClimbed ?? undefined,
      activeMinutes,
      caloriesBurned,
      activeCalories: day.activeCalories ?? undefined,
      dataSources: JSON.stringify([provider]),
      ...sleepPatch,
      ...hrPatch,
      ...vitalsPatch,
      ...recoveryPatch,
    },
    update: {
      steps,
      distanceM,
      floorsClimbed: floorsClimbed ?? undefined,
      activeMinutes,
      caloriesBurned,
      activeCalories: day.activeCalories ?? existing?.activeCalories ?? undefined,
      dataSources: mergeSources(existing?.dataSources, provider),
      ...sleepPatch,
      ...hrPatch,
      ...vitalsPatch,
      ...recoveryPatch,
    },
  });

  if (isCategoryEnabled(prefs, "weight") && day.weightKg != null) {
    await prisma.profile.update({
      where: { userId },
      data: {
        weightKg: day.weightKg,
        ...(isCategoryEnabled(prefs, "bodyFat") && day.bodyFatPct != null
          ? { bodyFatPct: day.bodyFatPct }
          : {}),
        ...(isCategoryEnabled(prefs, "muscleMass") && day.muscleMassKg != null
          ? { muscleMassKg: day.muscleMassKg }
          : {}),
      },
    });
  }

  await markSyncRecord(userId, provider, recordKey);
  return { applied: true, duplicate: false };
}

export async function applyWearableWorkout(
  userId: string,
  provider: WearableProvider,
  workout: WearableWorkoutSnapshot
): Promise<{ applied: boolean; duplicate: boolean }> {
  const prefs = await getHealthSyncPreferences(userId);
  if (!isCategoryEnabled(prefs, "workouts")) {
    return { applied: false, duplicate: false };
  }

  const recordKey = `workout:${workout.externalId}`;
  const isNew = await isSyncRecordNew(userId, provider, recordKey);
  if (!isNew) return { applied: false, duplicate: true };

  try {
    await prisma.enduranceActivity.create({
      data: {
        userId,
        type: mapWorkoutType(workout.type),
        startedAt: new Date(workout.startedAt),
        durationSec: workout.durationSec,
        distanceM: workout.distanceM,
        caloriesBurned: workout.caloriesBurned,
        avgHeartRate: workout.avgHeartRate,
        maxHeartRate: workout.maxHeartRate,
        sourceProvider: provider,
        externalId: workout.externalId,
        notes: `Importiert von ${provider}`,
      },
    });
  } catch {
    return { applied: false, duplicate: true };
  }

  await markSyncRecord(userId, provider, recordKey);
  return { applied: true, duplicate: false };
}
