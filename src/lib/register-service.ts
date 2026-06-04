import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { dbQuery } from "@/lib/prisma";
import {
  generateVerificationCode,
  verificationExpiresAt,
  isEmailVerified,
  isEmailVerificationEnabled,
} from "@/lib/verification";
import { sendVerificationEmail, isEmailConfigured } from "@/lib/email";
import {
  isDatabaseConnectionError,
  isSchemaMismatchError,
} from "@/lib/prisma-errors";

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type RegisterResult =
  | {
      ok: true;
      email: string;
      emailSent: boolean;
      emailWarning?: string;
      devVerificationCode?: string;
      message: string;
      skipVerifyPage: boolean;
    }
  | { ok: false; status: number; error: string };

function mapPrismaError(error: unknown): RegisterResult | null {
  if (isDatabaseConnectionError(error)) {
    return {
      ok: false,
      status: 503,
      error:
        "Datenbank nicht erreichbar. Prüfe Supabase DATABASE_URL in .env und npm run db:verify-supabase",
    };
  }

  if (isSchemaMismatchError(error)) {
    return {
      ok: false,
      status: 503,
      error: "Datenbank-Schema veraltet. Bitte ausführen: npx prisma migrate deploy",
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      ok: false,
      status: 503,
      error:
        "Datenbank nicht initialisiert. Führe aus: npm run db:setup",
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
    verificationCode: string | null;
    verificationExpires: Date | null;
    emailVerified: Date | null;
  },
  existingId?: string
) {
  if (existingId) {
    await db.user.update({
      where: { id: existingId },
      data: {
        name: data.name,
        passwordHash: data.passwordHash,
        verificationCode: data.verificationCode,
        verificationExpires: data.verificationExpires,
        emailVerified: data.emailVerified,
      },
    });
    return existingId;
  }

  const newUser = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      emailVerified: data.emailVerified,
      verificationCode: data.verificationCode,
      verificationExpires: data.verificationExpires,
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
  const verificationEnabled = isEmailVerificationEnabled();
  let step = 0;

  try {
    return await dbQuery("registerUser", async (db) => {
    step = 1;
    const existing = await db.user.findUnique({ where: { email } });

    if (existing && isEmailVerified(existing.emailVerified)) {
      return { ok: false, status: 409, error: "Diese E-Mail ist bereits registriert." };
    }

    step = 2;
    const code = verificationEnabled ? generateVerificationCode() : null;
    const expires = verificationEnabled ? verificationExpiresAt() : null;

    step = 3;
    const passwordHash = await bcrypt.hash(input.password, 12);

    step = 4;
    await upsertUserWithStreak(
      db,
      {
        name: input.name,
        email,
        passwordHash,
        verificationCode: code,
        verificationExpires: expires,
        emailVerified: verificationEnabled ? null : new Date(),
      },
      existing?.id
    );

    if (!verificationEnabled) {
      return {
        ok: true,
        email,
        emailSent: false,
        skipVerifyPage: true,
        message: "Konto erstellt. Du kannst dich jetzt anmelden.",
      };
    }

    step = 5;
    let emailSent = false;
    let emailWarning: string | undefined;
    let devVerificationCode: string | undefined;

    try {
      await sendVerificationEmail(email, input.name, code!);
      emailSent = true;
    } catch (emailError) {
      console.error("REGISTRATION EMAIL ERROR:", emailError);
      emailWarning =
        emailError instanceof Error
          ? emailError.message
          : "E-Mail konnte nicht gesendet werden";

      if (process.env.NODE_ENV === "development") {
        devVerificationCode = code!;
        console.error(
          `[DEV] Bestätigungscode für ${email}: ${code} (E-Mail: ${
            isEmailConfigured() ? "konfiguriert, Versand fehlgeschlagen" : "nicht konfiguriert"
          })`
        );
      } else if (!isEmailConfigured()) {
        return {
          ok: false,
          status: 503,
          error:
            "E-Mail-Versand nicht konfiguriert. Administrator muss RESEND_API_KEY oder SMTP setzen.",
        };
      } else {
        return {
          ok: false,
          status: 503,
          error: `E-Mail konnte nicht gesendet werden: ${emailWarning}`,
        };
      }
    }

    return {
      ok: true,
      email,
      emailSent,
      emailWarning,
      devVerificationCode,
      skipVerifyPage: false,
      message: emailSent
        ? "Registrierung gestartet. Wir haben dir einen 6-stelligen Code per E-Mail gesendet."
        : "Konto erstellt. E-Mail-Versand fehlgeschlagen – nutze den Dev-Code aus der Server-Konsole oder fordere einen neuen Code an.",
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
