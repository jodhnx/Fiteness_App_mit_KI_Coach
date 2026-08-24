-- WearableProvider enum extensions
ALTER TYPE "WearableProvider" ADD VALUE IF NOT EXISTS 'GOOGLE_FIT';
ALTER TYPE "WearableProvider" ADD VALUE IF NOT EXISTS 'GOOGLE_HEALTH_CONNECT';
ALTER TYPE "WearableProvider" ADD VALUE IF NOT EXISTS 'POLAR';
ALTER TYPE "WearableProvider" ADD VALUE IF NOT EXISTS 'HUAWEI_HEALTH';
ALTER TYPE "WearableProvider" ADD VALUE IF NOT EXISTS 'WEAR_OS';
ALTER TYPE "WearableProvider" ADD VALUE IF NOT EXISTS 'COROS';
ALTER TYPE "WearableProvider" ADD VALUE IF NOT EXISTS 'SUUNTO';

-- DailyHealthMetric extended fields
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "floorsClimbed" INTEGER;
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "activeCalories" INTEGER;
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "restingHeartRate" INTEGER;
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "avgHeartRate" INTEGER;
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "maxHeartRate" INTEGER;
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "bloodOxygen" DOUBLE PRECISION;
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "bloodPressureSys" INTEGER;
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "bloodPressureDia" INTEGER;
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "bodyTempC" DOUBLE PRECISION;
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "sleepDeepHours" DOUBLE PRECISION;
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "sleepRemHours" DOUBLE PRECISION;
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "sleepLightHours" DOUBLE PRECISION;
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "sleepBedtime" TIMESTAMP(3);
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "sleepWakeTime" TIMESTAMP(3);
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "recoveryScore" INTEGER;
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "trainingReadiness" INTEGER;
ALTER TABLE "DailyHealthMetric" ADD COLUMN IF NOT EXISTS "dataSources" TEXT;

-- EnduranceActivity wearable fields
ALTER TABLE "EnduranceActivity" ADD COLUMN IF NOT EXISTS "sourceProvider" "WearableProvider";
ALTER TABLE "EnduranceActivity" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "EnduranceActivity" ADD COLUMN IF NOT EXISTS "avgHeartRate" INTEGER;
ALTER TABLE "EnduranceActivity" ADD COLUMN IF NOT EXISTS "maxHeartRate" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "EnduranceActivity_userId_sourceProvider_externalId_key"
  ON "EnduranceActivity"("userId", "sourceProvider", "externalId");

-- WearableConnection
ALTER TABLE "WearableConnection" ADD COLUMN IF NOT EXISTS "lastSyncError" TEXT;

-- Health sync preferences
CREATE TABLE IF NOT EXISTS "HealthSyncPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "steps" BOOLEAN NOT NULL DEFAULT true,
  "distance" BOOLEAN NOT NULL DEFAULT true,
  "floors" BOOLEAN NOT NULL DEFAULT true,
  "activeMinutes" BOOLEAN NOT NULL DEFAULT true,
  "calories" BOOLEAN NOT NULL DEFAULT true,
  "sleep" BOOLEAN NOT NULL DEFAULT true,
  "heartRate" BOOLEAN NOT NULL DEFAULT true,
  "workouts" BOOLEAN NOT NULL DEFAULT true,
  "weight" BOOLEAN NOT NULL DEFAULT true,
  "bodyFat" BOOLEAN NOT NULL DEFAULT false,
  "muscleMass" BOOLEAN NOT NULL DEFAULT false,
  "bloodPressure" BOOLEAN NOT NULL DEFAULT false,
  "bloodOxygen" BOOLEAN NOT NULL DEFAULT true,
  "bodyTemp" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HealthSyncPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HealthSyncPreference_userId_key" ON "HealthSyncPreference"("userId");

ALTER TABLE "HealthSyncPreference" DROP CONSTRAINT IF EXISTS "HealthSyncPreference_userId_fkey";
ALTER TABLE "HealthSyncPreference" ADD CONSTRAINT "HealthSyncPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Health sync dedup records
CREATE TABLE IF NOT EXISTS "HealthSyncRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "WearableProvider" NOT NULL,
  "recordKey" TEXT NOT NULL,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HealthSyncRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HealthSyncRecord_userId_provider_recordKey_key"
  ON "HealthSyncRecord"("userId", "provider", "recordKey");
CREATE INDEX IF NOT EXISTS "HealthSyncRecord_userId_syncedAt_idx" ON "HealthSyncRecord"("userId", "syncedAt");

ALTER TABLE "HealthSyncRecord" DROP CONSTRAINT IF EXISTS "HealthSyncRecord_userId_fkey";
ALTER TABLE "HealthSyncRecord" ADD CONSTRAINT "HealthSyncRecord_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
