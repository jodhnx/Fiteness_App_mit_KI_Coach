import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { dbQuery } from "@/lib/prisma";

export const ADMIN_EMAIL = "admin@aifitness.local";
export const ADMIN_PASSWORD = "Admin123!";

async function upsertAdmin(db: PrismaClient) {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const existing = await db.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });

  const admin = await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      name: "Administrator",
      role: "ADMIN",
      passwordHash,
      emailVerified: new Date(),
      onboardingCompletedAt: new Date(),
      verificationCode: null,
      verificationExpires: null,
      profile: { create: {} },
    },
    update: {
      role: "ADMIN",
      passwordHash,
      emailVerified: new Date(),
      onboardingCompletedAt: new Date(),
      verificationCode: null,
      verificationExpires: null,
    },
  });

  await db.streak.upsert({
    where: { userId: admin.id },
    create: { userId: admin.id, currentDays: 0 },
    update: {},
  });

  await db.trainingStreak.upsert({
    where: { userId: admin.id },
    create: { userId: admin.id },
    update: {},
  });

  return { created: !existing, email: ADMIN_EMAIL };
}

/** Ensures demo admin exists with verified email and completed onboarding. */
export async function ensureAdminUser(): Promise<{ created: boolean; email: string }> {
  return dbQuery("ensureAdminUser", upsertAdmin);
}

export async function hasAdminUser(): Promise<boolean> {
  return dbQuery("hasAdminUser", async (db) => {
    const count = await db.user.count({ where: { role: "ADMIN" } });
    return count > 0;
  });
}
