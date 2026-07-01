import type { WearableProvider } from "@prisma/client";

export type HealthMetricCategory =
  | "steps"
  | "distance"
  | "floors"
  | "activeMinutes"
  | "calories"
  | "sleep"
  | "heartRate"
  | "workouts"
  | "weight"
  | "bodyFat"
  | "muscleMass"
  | "bloodPressure"
  | "bloodOxygen"
  | "bodyTemp";

export type HealthDaySnapshot = {
  date: string;
  steps?: number;
  distanceM?: number;
  floorsClimbed?: number;
  activeMinutes?: number;
  caloriesBurned?: number;
  activeCalories?: number;
  sleepHours?: number;
  sleepQuality?: string;
  sleepDeepHours?: number;
  sleepRemHours?: number;
  sleepLightHours?: number;
  sleepBedtime?: string;
  sleepWakeTime?: string;
  restingHeartRate?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  bloodOxygen?: number;
  bloodPressureSys?: number;
  bloodPressureDia?: number;
  bodyTempC?: number;
  recoveryScore?: number;
  trainingReadiness?: number;
  weightKg?: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
};

export type WearableWorkoutSnapshot = {
  externalId: string;
  type: string;
  startedAt: string;
  durationSec: number;
  distanceM?: number;
  caloriesBurned?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
};

export type ProviderSyncResult = {
  provider: WearableProvider;
  importedDays: number;
  importedWorkouts: number;
  skippedDuplicates: number;
  error?: string;
};

export type ProviderMeta = {
  id: WearableProvider;
  name: string;
  platform: "web_oauth" | "native_bridge" | "both";
  color: string;
  description: string;
  apiNote: string;
};

export const HEALTH_CATEGORY_LABELS: Record<HealthMetricCategory, string> = {
  steps: "Schritte",
  distance: "Distanz",
  floors: "Stockwerke",
  activeMinutes: "Bewegungsminuten",
  calories: "Kalorienverbrauch",
  sleep: "Schlaf",
  heartRate: "Herzfrequenz",
  workouts: "Workouts",
  weight: "Gewicht",
  bodyFat: "Körperfett",
  muscleMass: "Muskelmasse",
  bloodPressure: "Blutdruck",
  bloodOxygen: "Blutsauerstoff (SpO₂)",
  bodyTemp: "Hauttemperatur",
};
