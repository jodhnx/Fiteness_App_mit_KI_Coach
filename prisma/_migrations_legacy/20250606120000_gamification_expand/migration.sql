-- Safe gamification columns (existing Achievement rows keep all data)

-- Achievement: nullable metricKey first, defaults for other columns
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "tier" TEXT;
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "targetValue" INTEGER;
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "metricKey" TEXT;
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER;

-- Fix failed prior attempt: allow NULL on metricKey
ALTER TABLE "Achievement" ALTER COLUMN "metricKey" DROP NOT NULL;

ALTER TABLE "Achievement" ALTER COLUMN "tier" SET DEFAULT 'bronze';
ALTER TABLE "Achievement" ALTER COLUMN "targetValue" SET DEFAULT 1;
ALTER TABLE "Achievement" ALTER COLUMN "sortOrder" SET DEFAULT 0;

UPDATE "Achievement" SET "tier" = 'bronze' WHERE "tier" IS NULL;
UPDATE "Achievement" SET "targetValue" = 1 WHERE "targetValue" IS NULL;
UPDATE "Achievement" SET "sortOrder" = 0 WHERE "sortOrder" IS NULL;

UPDATE "Achievement" SET "metricKey" = 'workouts_completed'
WHERE "metricKey" IS NULL AND (
  "slug" = 'first-workout'
  OR "slug" LIKE 'workouts-%'
  OR "slug" = 'ten-workouts'
  OR "slug" LIKE 'training-%'
  OR "slug" LIKE 'volume-%'
  OR "slug" LIKE 'workout-hours-%'
  OR "slug" LIKE 'pr-%'
);

UPDATE "Achievement" SET "metricKey" = 'meals_logged'
WHERE "metricKey" IS NULL AND (
  "slug" LIKE 'meals-%' OR "slug" = 'nutrition-master'
);

UPDATE "Achievement" SET "metricKey" = 'protein_goal_days_streak'
WHERE "metricKey" IS NULL AND "slug" LIKE 'protein%';

UPDATE "Achievement" SET "metricKey" = 'calorie_goal_days'
WHERE "metricKey" IS NULL AND "slug" LIKE 'calorie%';

UPDATE "Achievement" SET "metricKey" = 'water_3l_days'
WHERE "metricKey" IS NULL AND "slug" LIKE 'water%';

UPDATE "Achievement" SET "metricKey" = 'fiber_goal_days'
WHERE "metricKey" IS NULL AND "slug" LIKE 'fiber%';

UPDATE "Achievement" SET "metricKey" = 'steps_single_day'
WHERE "metricKey" IS NULL AND "slug" LIKE 'steps-day-%';

UPDATE "Achievement" SET "metricKey" = 'steps_week_max'
WHERE "metricKey" IS NULL AND "slug" LIKE 'steps-week-%';

UPDATE "Achievement" SET "metricKey" = 'steps_total'
WHERE "metricKey" IS NULL AND (
  "slug" LIKE 'steps-total-%' OR "slug" LIKE 'steps-%'
);

UPDATE "Achievement" SET "metricKey" = 'active_streak_days'
WHERE "metricKey" IS NULL AND (
  "slug" LIKE 'active-streak-%' OR "slug" = 'streak-7'
);

UPDATE "Achievement" SET "metricKey" = 'sleep_8h_nights'
WHERE "metricKey" IS NULL AND "slug" LIKE 'sleep%';

UPDATE "Achievement" SET "metricKey" = 'weight_lost_kg'
WHERE "metricKey" IS NULL AND "slug" LIKE 'weight-lost%';

UPDATE "Achievement" SET "metricKey" = 'weight_gained_kg'
WHERE "metricKey" IS NULL AND "slug" LIKE 'weight-gained%';

UPDATE "Achievement" SET "metricKey" = 'weight_logs'
WHERE "metricKey" IS NULL AND "slug" LIKE 'weight-log%';

UPDATE "Achievement" SET "metricKey" = 'challenges_completed'
WHERE "metricKey" IS NULL AND "slug" LIKE 'challenges%';

UPDATE "Achievement" SET "metricKey" = 'activities_completed'
WHERE "metricKey" IS NULL AND "slug" LIKE 'activities%';

UPDATE "Achievement" SET "metricKey" = 'coach_messages'
WHERE "metricKey" IS NULL AND (
  "slug" = 'ai-explorer' OR "slug" LIKE 'coach%'
);

UPDATE "Achievement" SET "metricKey" = 'workouts_completed'
WHERE "metricKey" IS NULL;

-- Challenge period (optional until backfilled)
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "period" TEXT;
ALTER TABLE "Challenge" ALTER COLUMN "period" DROP NOT NULL;
ALTER TABLE "Challenge" ALTER COLUMN "period" SET DEFAULT 'weekly';
UPDATE "Challenge" SET "period" = 'weekly' WHERE "period" IS NULL;
