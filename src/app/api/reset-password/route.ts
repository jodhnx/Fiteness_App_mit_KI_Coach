import { NextRequest } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetRequestSchema, resetPasswordSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/security/rate-limit";
import { jsonOk, jsonError } from "@/lib/api-response";
import { getServerAuthBaseUrl } from "@/lib/auth-redirect";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const limit = rateLimit(`reset:${ip}`, 5, 3600_000);
  if (!limit.success) return jsonError("Zu viele Anfragen", 429);

  const body = await req.json();

  if (body.token) {
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");
    const record = await prisma.passwordResetToken.findUnique({
      where: { token: parsed.data.token },
      include: { user: true },
    });
    if (!record || record.expiresAt < new Date()) {
      return jsonError("Token ungültig oder abgelaufen");
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await prisma.passwordResetToken.delete({ where: { id: record.id } });
    return jsonOk({ message: "Passwort aktualisiert" });
  }

  const parsed = resetRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError("Ungültige E-Mail");
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return jsonOk({ message: "Falls die E-Mail existiert, wurde ein Link gesendet" });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });

  const resetUrl = `${getServerAuthBaseUrl()}/reset-password?token=${token}`;
  return jsonOk({
    message:
      process.env.NODE_ENV === "development"
        ? "Reset-Link erstellt (Entwicklung)"
        : "Falls die E-Mail existiert, wurde ein Link gesendet",
    resetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined,
  });
}
