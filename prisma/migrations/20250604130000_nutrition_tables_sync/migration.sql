-- Sync Prisma schema: nutrition tables, FoodItem extensions, Profile goals

-- Enums
DO $$ BEGIN
  CREATE TYPE "FoodCategory" AS ENUM (
    'MEAT', 'FISH', 'DAIRY', 'VEGETABLES', 'FRUIT', 'DRINKS', 'SWEETS',
    'FAST_FOOD', 'FITNESS', 'GRAINS', 'LEGUMES', 'OILS', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NutritionGoal" AS ENUM (
    'MUSCLE_GAIN', 'FAT_LOSS', 'MAINTENANCE', 'LEAN_BULK', 'RECOMP'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Profile extensions
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "nutritionGoal" "NutritionGoal";
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "waterTargetMl" INTEGER NOT NULL DEFAULT 2500;

-- FoodItem extensions
ALTER TABLE "FoodItem" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "FoodItem" ADD COLUMN IF NOT EXISTS "category" "FoodCategory" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "FoodItem" ADD COLUMN IF NOT EXISTS "fiberG" DOUBLE PRECISION;
ALTER TABLE "FoodItem" ADD COLUMN IF NOT EXISTS "offCode" TEXT;
ALTER TABLE "FoodItem" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "FoodItem" ADD COLUMN IF NOT EXISTS "dataSource" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "FoodItem" ADD COLUMN IF NOT EXISTS "userId" TEXT;

UPDATE "FoodItem" SET "slug" = 'food-' || "id" WHERE "slug" IS NULL OR "slug" = '';

DO $$ BEGIN
  ALTER TABLE "FoodItem" ALTER COLUMN "slug" SET NOT NULL;
EXCEPTION WHEN others THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "FoodItem_slug_key" ON "FoodItem"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "FoodItem_offCode_key" ON "FoodItem"("offCode") WHERE "offCode" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "FoodItem_category_idx" ON "FoodItem"("category");
CREATE INDEX IF NOT EXISTS "FoodItem_name_idx" ON "FoodItem"("name");
CREATE INDEX IF NOT EXISTS "FoodItem_userId_idx" ON "FoodItem"("userId");
CREATE INDEX IF NOT EXISTS "FoodItem_brand_idx" ON "FoodItem"("brand");

DO $$ BEGIN
  ALTER TABLE "FoodItem" ADD CONSTRAINT "FoodItem_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- FoodSearchHistory
CREATE TABLE IF NOT EXISTS "FoodSearchHistory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FoodSearchHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FoodSearchHistory_userId_createdAt_idx"
  ON "FoodSearchHistory"("userId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "FoodSearchHistory" ADD CONSTRAINT "FoodSearchHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- FoodFavorite
CREATE TABLE IF NOT EXISTS "FoodFavorite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "foodItemId" TEXT NOT NULL,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FoodFavorite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FoodFavorite_userId_foodItemId_key"
  ON "FoodFavorite"("userId", "foodItemId");
DO $$ BEGIN
  ALTER TABLE "FoodFavorite" ADD CONSTRAINT "FoodFavorite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "FoodFavorite" ADD CONSTRAINT "FoodFavorite_foodItemId_fkey"
    FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- FoodRecent
CREATE TABLE IF NOT EXISTS "FoodRecent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "foodItemId" TEXT NOT NULL,
  "useCount" INTEGER NOT NULL DEFAULT 1,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FoodRecent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FoodRecent_userId_foodItemId_key"
  ON "FoodRecent"("userId", "foodItemId");
CREATE INDEX IF NOT EXISTS "FoodRecent_userId_lastUsedAt_idx"
  ON "FoodRecent"("userId", "lastUsedAt");
DO $$ BEGIN
  ALTER TABLE "FoodRecent" ADD CONSTRAINT "FoodRecent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "FoodRecent" ADD CONSTRAINT "FoodRecent_foodItemId_fkey"
    FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- WaterLog
CREATE TABLE IF NOT EXISTS "WaterLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "amountMl" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WaterLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WaterLog_userId_date_idx" ON "WaterLog"("userId", "date");
DO $$ BEGIN
  ALTER TABLE "WaterLog" ADD CONSTRAINT "WaterLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Recipe
CREATE TABLE IF NOT EXISTS "Recipe" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "servings" INTEGER NOT NULL DEFAULT 1,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- RecipeIngredient
CREATE TABLE IF NOT EXISTS "RecipeIngredient" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "foodItemId" TEXT NOT NULL,
  "quantityG" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey"
    FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_foodItemId_fkey"
    FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Meal unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "Meal_userId_date_mealType_key"
  ON "Meal"("userId", "date", "mealType");
