-- Meal types (idempotent)
DO $$ BEGIN
  ALTER TYPE "MealType" ADD VALUE IF NOT EXISTS 'PRE_WORKOUT';
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TYPE "MealType" ADD VALUE IF NOT EXISTS 'POST_WORKOUT';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Endurance activity type
DO $$ BEGIN
  CREATE TYPE "EnduranceActivityType" AS ENUM (
    'RUNNING', 'JOGGING', 'CYCLING', 'HIKING', 'WALKING', 'SWIMMING'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "EnduranceActivity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "EnduranceActivityType" NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "durationSec" INTEGER NOT NULL,
  "distanceM" DOUBLE PRECISION,
  "caloriesBurned" INTEGER,
  "avgSpeedKmh" DOUBLE PRECISION,
  "elevationM" DOUBLE PRECISION,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnduranceActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EnduranceActivity_userId_startedAt_idx"
  ON "EnduranceActivity"("userId", "startedAt");

DO $$ BEGIN
  ALTER TABLE "EnduranceActivity"
    ADD CONSTRAINT "EnduranceActivity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Meal unique per day (if missing)
CREATE UNIQUE INDEX IF NOT EXISTS "Meal_userId_date_mealType_key"
  ON "Meal"("userId", "date", "mealType");
