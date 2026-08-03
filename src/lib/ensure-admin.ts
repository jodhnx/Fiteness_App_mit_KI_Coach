import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { dbQuery } from "@/lib/prisma";

export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL?.trim().toLowerCase() || "admin@aifitness.local";

/**
 * Demo/bootstrap admin password — only used when creating a NEW admin
 * and ADMIN_BOOTSTRAP_PASSWORD (or legacy ADMIN_PASSWORD) is set.
 * Never resets an existing admin password.
 */
function bootstrapPassword(): string | null {
  const fromEnv =
    process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() ||
    process.env.ADMIN_PASSWORD?.trim();
  if (fromEnv && fromEnv.length >= 12) return fromEnv;
  // Dev-only fallback — disabled in production
  if (process.env.NODE_ENV !== "production") return "Admin123!ChangeMe";
  return null;
}

async function upsertAdmin(db: PrismaClient) {
  const existing = await db.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true, passwordHash: true },
  });

  if (existing) {
    // Never rewrite passwordHash — only ensure role/onboarding flags
    const admin = await db.user.update({
      where: { email: ADMIN_EMAIL },
      data: {
        role: "ADMIN",
        emailVerified: new Date(),
        onboardingCompletedAt: new Date(),
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
    return { created: false, email: ADMIN_EMAIL };
  }

  const password = bootstrapPassword();
  if (!password) {
    throw new Error(
      "Kein Admin vorhanden und ADMIN_BOOTSTRAP_PASSWORD nicht gesetzt (min. 12 Zeichen)."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await db.user.create({
    data: {
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

  return { created: true, email: ADMIN_EMAIL };
}

/** Ensures admin exists. Does NOT reset existing passwords. */
export async function ensureAdminUser(): Promise<{ created: boolean; email: string }> {
  return dbQuery("ensureAdminUser", upsertAdmin);
}

export async function hasAdminUser(): Promise<boolean> {
  return dbQuery("hasAdminUser", async (db) => {
    const count = await db.user.count({ where: { role: "ADMIN" } });
    return count > 0;
  });
}

/** @deprecated — do not use hardcoded password in production */
export const ADMIN_PASSWORD = bootstrapPassword() ?? "";
