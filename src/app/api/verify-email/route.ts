import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyEmailSchema, resendVerificationSchema, validationErrorMessage } from "@/lib/validations";
import { rateLimit } from "@/lib/security/rate-limit";
import { jsonOk, jsonError } from "@/lib/api-response";
import {
  generateVerificationCode,
  verificationExpiresAt,
  isEmailVerified,
} from "@/lib/verification";
import { sendVerificationEmail } from "@/lib/email";
import { awardXP } from "@/lib/gamification";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    const limit = rateLimit(`verify:${ip}`, 10, 3600_000);
    if (!limit.success) {
      return jsonError("Zu viele Versuche. Bitte später erneut versuchen.", 429);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Ungültige Anfrage", 400);
    }

    const parsed = verifyEmailSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(validationErrorMessage(parsed), 400);
    }

    const email = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return jsonError("Kein Konto mit dieser E-Mail gefunden.", 404);
    }

    if (isEmailVerified(user.emailVerified)) {
      return jsonOk({ message: "E-Mail ist bereits bestätigt.", alreadyVerified: true });
    }

    if (!user.verificationCode || !user.verificationExpires) {
      return jsonError("Kein gültiger Code vorhanden. Bitte Code erneut anfordern.", 400);
    }

    if (user.verificationExpires < new Date()) {
      return jsonError("Der Bestätigungscode ist abgelaufen. Bitte einen neuen Code anfordern.", 410);
    }

    if (user.verificationCode !== parsed.data.code) {
      return jsonError("Falscher Bestätigungscode.", 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationCode: null,
        verificationExpires: null,
      },
    });

    try {
      const xpCount = await prisma.xPTransaction.count({
        where: { userId: user.id, reason: "Registrierung bestätigt" },
      });
      if (xpCount === 0) {
        await awardXP(user.id, 100, "Registrierung bestätigt");
      }
    } catch (xpError) {
      console.error("VERIFY EMAIL XP (non-fatal):", xpError);
    }

    return jsonOk({
      message: "E-Mail erfolgreich bestätigt. Du kannst dich jetzt anmelden.",
    });
  } catch (error) {
    console.error("VERIFY EMAIL ERROR:", error);
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return jsonError("Datenbank nicht erreichbar.", 503);
    }
    return jsonError("Serverfehler bei der Verifizierung.", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    const limit = rateLimit(`verify-resend:${ip}`, 5, 3600_000);
    if (!limit.success) {
      return jsonError("Zu viele Anfragen. Bitte später erneut versuchen.", 429);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Ungültige Anfrage", 400);
    }

    const parsed = resendVerificationSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(validationErrorMessage(parsed), 400);
    }

    const email = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return jsonError("Kein Konto mit dieser E-Mail gefunden.", 404);
    }

    if (isEmailVerified(user.emailVerified)) {
      return jsonError("Diese E-Mail ist bereits bestätigt.", 400);
    }

    const code = generateVerificationCode();
    const expires = verificationExpiresAt();

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: code, verificationExpires: expires },
    });

    await sendVerificationEmail(email, user.name ?? "Athlet", code);

    return jsonOk({ message: "Neuer Bestätigungscode wurde gesendet." });
  } catch (error) {
    console.error("VERIFY EMAIL RESEND ERROR:", error);
    if (error instanceof Error && error.message.includes("E-Mail-Versand")) {
      return jsonError(error.message, 503);
    }
    return jsonError("Serverfehler beim Senden des Codes.", 500);
  }
}
