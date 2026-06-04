/**
 * Marks existing users with complete profiles as onboarding-done.
 * Run: npx tsx scripts/migrate-onboarding-users.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { onboardingCompletedAt: null },
    include: { profile: true },
  });

  let updated = 0;
  for (const u of users) {
    const p = u.profile;
    if (
      p?.age &&
      p.weightKg &&
      p.heightCm &&
      p.gender &&
      p.activityLevel &&
      p.nutritionGoal &&
      p.trainingGoal
    ) {
      await prisma.user.update({
        where: { id: u.id },
        data: { onboardingCompletedAt: new Date() },
      });
      updated++;
    }
  }
  console.log(`Onboarding migration: ${updated} users marked complete.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
