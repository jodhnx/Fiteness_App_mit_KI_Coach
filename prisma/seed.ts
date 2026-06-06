import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { seedExercises } from "./seed-exercises";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  await seedExercises();

  const { seedAchievementsAndLevels, seedExtendedChallenges } = await import("./seed-achievements");
  await seedAchievementsAndLevels(prisma);
  await seedExtendedChallenges(prisma);

  if (process.env.SEED_FOODS !== "0") {
    const { seedFoods } = await import("./seed-foods");
    await seedFoods(prisma);
  } else {
    console.log("Food catalog skipped (SEED_FOODS=0). Run: npm run db:seed:foods");
  }

  const adminEmail = "admin@aifitness.local";
  const adminPasswordHash = await bcrypt.hash("Admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "Administrator",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
      emailVerified: new Date(),
      onboardingCompletedAt: new Date(),
      profile: { create: {} },
    },
    update: {
      role: "ADMIN",
      passwordHash: adminPasswordHash,
      emailVerified: new Date(),
      onboardingCompletedAt: new Date(),
      verificationCode: null,
      verificationExpires: null,
    },
  });
  await prisma.streak.upsert({
    where: { userId: admin.id },
    create: { userId: admin.id },
    update: {},
  });
  await prisma.trainingStreak.upsert({
    where: { userId: admin.id },
    create: { userId: admin.id },
    update: {},
  });

  console.log("Seed abgeschlossen. Admin: admin@aifitness.local / Admin123!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
