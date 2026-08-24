-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WearableProvider" ADD VALUE 'GOOGLE_FIT';
ALTER TYPE "WearableProvider" ADD VALUE 'GOOGLE_HEALTH_CONNECT';
ALTER TYPE "WearableProvider" ADD VALUE 'POLAR';
ALTER TYPE "WearableProvider" ADD VALUE 'HUAWEI_HEALTH';
ALTER TYPE "WearableProvider" ADD VALUE 'WEAR_OS';
ALTER TYPE "WearableProvider" ADD VALUE 'COROS';
ALTER TYPE "WearableProvider" ADD VALUE 'SUUNTO';

-- AlterTable
ALTER TABLE "DailyHealthMetric" ADD COLUMN     "activeCalories" INTEGER,
ADD COLUMN     "avgHeartRate" INTEGER,
ADD COLUMN     "bloodOxygen" DOUBLE PRECISION,
ADD COLUMN     "bloodPressureDia" INTEGER,
ADD COLUMN     "bloodPressureSys" INTEGER,
ADD COLUMN     "bodyTempC" DOUBLE PRECISION,
ADD COLUMN     "dataSources" TEXT,
ADD COLUMN     "floorsClimbed" INTEGER,
ADD COLUMN     "maxHeartRate" INTEGER,
ADD COLUMN     "recoveryScore" INTEGER,
ADD COLUMN     "restingHeartRate" INTEGER,
ADD COLUMN     "sleepBedtime" TIMESTAMP(3),
ADD COLUMN     "sleepDeepHours" DOUBLE PRECISION,
ADD COLUMN     "sleepLightHours" DOUBLE PRECISION,
ADD COLUMN     "sleepRemHours" DOUBLE PRECISION,
ADD COLUMN     "sleepWakeTime" TIMESTAMP(3),
ADD COLUMN     "trainingReadiness" INTEGER;

-- AlterTable
ALTER TABLE "EnduranceActivity" ADD COLUMN     "avgHeartRate" INTEGER,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "maxHeartRate" INTEGER,
ADD COLUMN     "sourceProvider" "WearableProvider";

-- AlterTable
ALTER TABLE "WearableConnection" ADD COLUMN     "lastSyncError" TEXT;

-- CreateTable
CREATE TABLE "NutritionStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentDays" INTEGER NOT NULL DEFAULT 0,
    "longestDays" INTEGER NOT NULL DEFAULT 0,
    "lastTrackedAt" TIMESTAMP(3),

    CONSTRAINT "NutritionStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthSyncPreference" (
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

-- CreateTable
CREATE TABLE "HealthSyncRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "WearableProvider" NOT NULL,
    "recordKey" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthSyncRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NutritionStreak_userId_key" ON "NutritionStreak"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthSyncPreference_userId_key" ON "HealthSyncPreference"("userId");

-- CreateIndex
CREATE INDEX "HealthSyncRecord_userId_syncedAt_idx" ON "HealthSyncRecord"("userId", "syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "HealthSyncRecord_userId_provider_recordKey_key" ON "HealthSyncRecord"("userId", "provider", "recordKey");

-- CreateIndex
CREATE UNIQUE INDEX "EnduranceActivity_userId_sourceProvider_externalId_key" ON "EnduranceActivity"("userId", "sourceProvider", "externalId");

-- CreateIndex
CREATE INDEX "ProgressEntry_userId_date_idx" ON "ProgressEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "ProgressEntry_userId_createdAt_idx" ON "ProgressEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProgressPhoto_userId_takenAt_idx" ON "ProgressPhoto"("userId", "takenAt");

-- CreateIndex
CREATE INDEX "Recipe_userId_idx" ON "Recipe"("userId");

-- CreateIndex
CREATE INDEX "Recipe_userId_isMealTemplate_idx" ON "Recipe"("userId", "isMealTemplate");

-- AddForeignKey
ALTER TABLE "NutritionStreak" ADD CONSTRAINT "NutritionStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthSyncPreference" ADD CONSTRAINT "HealthSyncPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthSyncRecord" ADD CONSTRAINT "HealthSyncRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
