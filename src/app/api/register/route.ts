import { NextRequest } from "next/server";
import { registerSchema, validationErrorMessage } from "@/lib/validations";
import { rateLimit } from "@/lib/security/rate-limit";
import { jsonOk, jsonError } from "@/lib/api-response";
import { registerUser } from "@/lib/register-service";
import { isEmailVerificationEnabled } from "@/lib/verification";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    const limit = rateLimit(`register:${ip}`, 5, 3600_000);
    if (!limit.success) {
      return jsonError(
        "Zu viele Registrierungsversuche. Bitte später erneut versuchen.",
        429
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Ungültige Anfrage", 400);
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const message = validationErrorMessage(parsed);
      if (parsed.error.issues.some((i) => i.path[0] === "email")) {
        return jsonError("Bitte eine gültige E-Mail-Adresse verwenden.", 400);
      }
      return jsonError(message, 400);
    }

    if (isEmailVerificationEnabled()) {
      const emailCheck = registerSchema.shape.email.safeParse(parsed.data.email);
      if (!emailCheck.success) {
        return jsonError("Bitte eine gültige E-Mail-Adresse verwenden.", 400);
      }
    }

    const result = await registerUser({
      name: parsed.data.name.trim(),
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (!result.ok) {
      return jsonError(result.error, result.status);
    }

    return jsonOk(
      {
        message: result.message,
        email: result.email,
        emailSent: result.emailSent,
        emailWarning: result.emailWarning,
        skipVerifyPage: result.skipVerifyPage,
        ...(result.devVerificationCode ? { devVerificationCode: result.devVerificationCode } : {}),
      },
      201
    );
  } catch (error) {
    console.error("REGISTRATION ERROR (unexpected):", error);
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return jsonError(`Serverfehler bei der Registrierung: ${message}`, 500);
  }
}
