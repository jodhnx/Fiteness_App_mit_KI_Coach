import { prisma } from "@/lib/prisma";
import type { WearableProvider } from "@prisma/client";
import type { HealthMetricCategory } from "@/lib/health/types";

export type HealthSyncPrefs = Record<HealthMetricCategory, boolean>;

const DEFAULT_PREFS: HealthSyncPrefs = {
  steps: true,
  distance: true,
  floors: true,
  activeMinutes: true,
  calories: true,
  sleep: true,
  heartRate: true,
  workouts: true,
  weight: true,
  bodyFat: false,
  muscleMass: false,
  bloodPressure: false,
  bloodOxygen: true,
  bodyTemp: false,
};

export async function getHealthSyncPreferences(userId: string): Promise<HealthSyncPrefs> {
  try {
    const row = await prisma.healthSyncPreference.findUnique({ where: { userId } });
    if (!row) return { ...DEFAULT_PREFS };
    return {
      steps: row.steps,
      distance: row.distance,
      floors: row.floors,
      activeMinutes: row.activeMinutes,
      calories: row.calories,
      sleep: row.sleep,
      heartRate: row.heartRate,
      workouts: row.workouts,
      weight: row.weight,
      bodyFat: row.bodyFat,
      muscleMass: row.muscleMass,
      bloodPressure: row.bloodPressure,
      bloodOxygen: row.bloodOxygen,
      bodyTemp: row.bodyTemp,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function upsertHealthSyncPreferences(
  userId: string,
  prefs: Partial<HealthSyncPrefs>
) {
  return prisma.healthSyncPreference.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_PREFS, ...prefs },
    update: prefs,
  });
}

export function isCategoryEnabled(
  prefs: HealthSyncPrefs,
  category: HealthMetricCategory
): boolean {
  return prefs[category] ?? true;
}

export async function isSyncRecordNew(
  userId: string,
  provider: WearableProvider,
  recordKey: string
): Promise<boolean> {
  try {
    const existing = await prisma.healthSyncRecord.findUnique({
      where: {
        userId_provider_recordKey: { userId, provider, recordKey },
      },
    });
    return !existing;
  } catch {
    return true;
  }
}

export async function markSyncRecord(
  userId: string,
  provider: WearableProvider,
  recordKey: string
) {
  try {
    await prisma.healthSyncRecord.upsert({
      where: {
        userId_provider_recordKey: { userId, provider, recordKey },
      },
      create: { userId, provider, recordKey },
      update: { syncedAt: new Date() },
    });
  } catch {
    /* dedup table optional during migration */
  }
}
