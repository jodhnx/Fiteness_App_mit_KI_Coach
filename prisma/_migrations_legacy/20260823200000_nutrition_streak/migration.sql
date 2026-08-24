-- CreateTable
CREATE TABLE "NutritionStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentDays" INTEGER NOT NULL DEFAULT 0,
    "longestDays" INTEGER NOT NULL DEFAULT 0,
    "lastTrackedAt" TIMESTAMP(3),

    CONSTRAINT "NutritionStreak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NutritionStreak_userId_key" ON "NutritionStreak"("userId");

-- AddForeignKey
ALTER TABLE "NutritionStreak" ADD CONSTRAINT "NutritionStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
