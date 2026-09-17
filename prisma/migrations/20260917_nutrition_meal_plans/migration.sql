-- Nutrition meal plans: extend NutritionPlan + day/meal/item tables
-- Idempotent: safe to re-run when partially applied.

-- Drop old stub columns if present (macros-only plan)
ALTER TABLE "NutritionPlan" DROP COLUMN IF EXISTS "calories";
ALTER TABLE "NutritionPlan" DROP COLUMN IF EXISTS "proteinG";
ALTER TABLE "NutritionPlan" DROP COLUMN IF EXISTS "carbsG";
ALTER TABLE "NutritionPlan" DROP COLUMN IF EXISTS "fatG";

DO $$ BEGIN
  CREATE TYPE "NutritionPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "NutritionPlan" ADD COLUMN IF NOT EXISTS "durationDays" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "NutritionPlan" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "NutritionPlan" ADD COLUMN IF NOT EXISTS "status" "NutritionPlanStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "NutritionPlan" ADD COLUMN IF NOT EXISTS "targetCalories" INTEGER;
ALTER TABLE "NutritionPlan" ADD COLUMN IF NOT EXISTS "targetProteinG" INTEGER;
ALTER TABLE "NutritionPlan" ADD COLUMN IF NOT EXISTS "targetCarbsG" INTEGER;
ALTER TABLE "NutritionPlan" ADD COLUMN IF NOT EXISTS "targetFatG" INTEGER;

CREATE TABLE IF NOT EXISTS "NutritionPlanDay" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NutritionPlanDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NutritionPlanMeal" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL,
    "title" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NutritionPlanMeal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NutritionPlanItem" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "foodItemId" TEXT,
    "recipeId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "brandSnapshot" TEXT,
    "quantityG" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "calories" DOUBLE PRECISION NOT NULL,
    "proteinG" DOUBLE PRECISION NOT NULL,
    "carbsG" DOUBLE PRECISION NOT NULL,
    "fatG" DOUBLE PRECISION NOT NULL,
    "fiberG" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NutritionPlanItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NutritionPlanDay_planId_dayNumber_key" ON "NutritionPlanDay"("planId", "dayNumber");
CREATE INDEX IF NOT EXISTS "NutritionPlanDay_planId_idx" ON "NutritionPlanDay"("planId");
CREATE INDEX IF NOT EXISTS "NutritionPlanMeal_dayId_sortOrder_idx" ON "NutritionPlanMeal"("dayId", "sortOrder");
CREATE INDEX IF NOT EXISTS "NutritionPlanItem_mealId_sortOrder_idx" ON "NutritionPlanItem"("mealId", "sortOrder");
CREATE INDEX IF NOT EXISTS "NutritionPlanItem_foodItemId_idx" ON "NutritionPlanItem"("foodItemId");
CREATE INDEX IF NOT EXISTS "NutritionPlan_userId_status_idx" ON "NutritionPlan"("userId", "status");
CREATE INDEX IF NOT EXISTS "NutritionPlan_userId_isActive_idx" ON "NutritionPlan"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "NutritionPlan_userId_updatedAt_idx" ON "NutritionPlan"("userId", "updatedAt");

DO $$ BEGIN
  ALTER TABLE "NutritionPlanDay" ADD CONSTRAINT "NutritionPlanDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "NutritionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "NutritionPlanMeal" ADD CONSTRAINT "NutritionPlanMeal_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "NutritionPlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "NutritionPlanItem" ADD CONSTRAINT "NutritionPlanItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "NutritionPlanMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "NutritionPlanItem" ADD CONSTRAINT "NutritionPlanItem_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
