import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { dbQuery } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import {
  isDatabaseConnectionError,
  isSchemaMismatchError,
} from "@/lib/prisma-errors";
import { formatApiErrorMessage } from "@/lib/format-api-error";
import {
  validateSupabaseDatabaseEnv,
  explainSupabasePoolerError,
  flattenErrorMessage,
} from "@/lib/database-url";

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type RegisterResult =
  | {
      ok: true;
      email: string;
      emailSent: false;
      message: string;
      skipVerifyPage: true;
    }
  | { ok: false; status: number; error: string };

function mapPrismaError(error: unknown): RegisterResult | null {
  if (isDatabaseConnectionError(error)) {
    const flat = flattenErrorMessage(error);
    const poolerHint = explainSupabasePoolerError(flat);
    if (poolerHint) {
      return { ok: false, status: 503, error: poolerHint };
    }
    const env = validateSupabaseDatabaseEnv();
    const detail = env.ok
      ? "Supabase-Host nicht erreichbar — Passwort oder Projekt-Status prüfen."
      : env.issues.join(" ");
    return {
      ok: false,
      status: 503,
      error: `Datenbank nicht erreichbar: ${detail}`,
    };
  }

  if (isSchemaMismatchError(error)) {
    return {
      ok: false,
      status: 503,
      error: formatApiErrorMessage(error),
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      ok: false,
      status: 503,
      error: "Datenbank nicht initialisiert. Führe aus: npm run db:setup",
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return { ok: false, status: 409, error: "Diese E-Mail ist bereits registriert." };
    }
    if (error.code === "P2021" || error.code === "P2010") {
      return {
        ok: false,
        status: 503,
        error: "Datenbank-Tabellen fehlen. Führe aus: npm run db:push",
      };
    }
  }

  return null;
}

async function upsertUserWithStreak(
  db: import("@prisma/client").PrismaClient,
  data: {
    name: string;
    email: string;
    passwordHash: string;
  },
  existingId?: string
) {
  if (existingId) {
    await db.user.update({
      where: { id: existingId },
      data: {
        name: data.name,
        passwordHash: data.passwordHash,
        verificationCode: null,
        verificationExpires: null,
        emailVerified: new Date(),
      },
    });
    return existingId;
  }

  const newUser = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      emailVerified: new Date(),
      verificationCode: null,
      verificationExpires: null,
      profile: { create: {} },
    },
  });

  await db.streak.upsert({
    where: { userId: newUser.id },
    create: { userId: newUser.id, currentDays: 0 },
    update: {},
  });

  return newUser.id;
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const email = input.email.toLowerCase().trim();
  let step = 0;

  try {
    return await dbQuery("registerUser", async (db) => {
      step = 1;
      const existing = await db.user.findUnique({ where: { email } });

      if (existing && isEmailVerified(existing.emailVerified)) {
        return { ok: false, status: 409, error: "Diese E-Mail ist bereits registriert." };
      }

      step = 2;
      const passwordHash = await bcrypt.hash(input.password, 12);

      step = 3;
      await upsertUserWithStreak(
        db,
        {
          name: input.name,
          email,
          passwordHash,
        },
        existing?.id
      );

      return {
        ok: true,
        email,
        emailSent: false,
        skipVerifyPage: true,
        message: "Konto erstellt. Du kannst dich jetzt anmelden.",
      };
    });
  } catch (error) {
    console.error(`REGISTRATION FAILED AT STEP ${step}`);
    console.error(error);

    const mapped = mapPrismaError(error);
    if (mapped) return mapped;

    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return {
      ok: false,
      status: 500,
      error: `Registrierung fehlgeschlagen (Schritt ${step}): ${message}`,
    };
  }
}
