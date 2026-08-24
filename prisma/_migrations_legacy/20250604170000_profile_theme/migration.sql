ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "theme" TEXT NOT NULL DEFAULT 'turquoise';
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "uiDensity" TEXT NOT NULL DEFAULT 'standard';

UPDATE "User" u
SET "onboardingCompletedAt" = COALESCE(u."onboardingCompletedAt", NOW())
FROM "Profile" p
WHERE p."userId" = u.id
  AND u."onboardingCompletedAt" IS NULL
  AND p.age IS NOT NULL
  AND p."weightKg" IS NOT NULL
  AND p."heightCm" IS NOT NULL
  AND p.gender IS NOT NULL
  AND p."activityLevel" IS NOT NULL;
