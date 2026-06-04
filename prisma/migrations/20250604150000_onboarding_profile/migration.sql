-- Onboarding + extended profile
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "experienceLevel" "PlanLevel";
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "workoutDaysPerWeek" INTEGER;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "bmi" DOUBLE PRECISION;

-- Existing users with complete profile → mark onboarding done
UPDATE "User" u
SET "onboardingCompletedAt" = COALESCE(u."onboardingCompletedAt", NOW())
FROM "Profile" p
WHERE p."userId" = u.id
  AND u."onboardingCompletedAt" IS NULL
  AND p.age IS NOT NULL
  AND p."weightKg" IS NOT NULL
  AND p."heightCm" IS NOT NULL
  AND p.gender IS NOT NULL
  AND p."activityLevel" IS NOT NULL
  AND p."nutritionGoal" IS NOT NULL;
