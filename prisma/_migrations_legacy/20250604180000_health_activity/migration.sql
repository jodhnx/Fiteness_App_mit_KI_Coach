-- AlterEnum
ALTER TYPE "EnduranceActivityType" ADD VALUE IF NOT EXISTS 'ROWING';
ALTER TYPE "EnduranceActivityType" ADD VALUE IF NOT EXISTS 'OTHER';

-- Profile health goals
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "dailyStepGoal" INTEGER NOT NULL DEFAULT 10000;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "activeMinuteGoal" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "moveCalorieGoal" INTEGER NOT NULL DEFAULT 500;

-- Daily health metrics
CREATE TABLE IF NOT EXISTS "DailyHealthMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "steps" INTEGER NOT NULL DEFAULT 0,
    "activeMinutes" INTEGER NOT NULL DEFAULT 0,
    "distanceM" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "caloriesBurned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyHealthMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyHealthMetric_userId_date_key" ON "DailyHealthMetric"("userId", "date");
CREATE INDEX IF NOT EXISTS "DailyHealthMetric_userId_date_idx" ON "DailyHealthMetric"("userId", "date");

DO $$ BEGIN
  ALTER TABLE "DailyHealthMetric" ADD CONSTRAINT "DailyHealthMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
