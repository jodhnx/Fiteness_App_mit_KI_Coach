import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { rateLimit } from "@/lib/security/rate-limit";

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.confirmPassword != null && v.confirmPassword !== v.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwörter stimmen nicht überein",
        path: ["confirmPassword"],
      });
    }
    if (v.newPassword === v.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Neues Passwort muss sich vom aktuellen unterscheiden",
        path: ["newPassword"],
      });
    }
  });

/** Auth capability for the signed-in user (no secrets). */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        passwordHash: true,
        isGuest: true,
        email: true,
        accounts: { select: { provider: true } },
      },
    });
    if (!user) return jsonError("Benutzer nicht gefunden", 404);

    const providers = user.accounts.map((a) => a.provider);
    return jsonOk({
      hasPassword: Boolean(user.passwordHash) && !user.isGuest,
      isGuest: Boolean(user.isGuest),
      providers,
      email: user.email,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Change password while logged in. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const limit = rateLimit(`pwd-change:${session.user.id}`, 8, 3600_000);
    if (!limit.success) return jsonError("Zu viele Versuche", 429);

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const msg =
        parsed.error.issues[0]?.message ??
        "Neues Passwort muss mindestens 8 Zeichen haben";
      return jsonError(msg, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true, isGuest: true },
    });
    if (!user?.passwordHash || user.isGuest) {
      return jsonError(
        "Dieses Konto hat kein Passwort (z. B. nur Google-Anmeldung). Passwortänderung nicht möglich.",
        400
      );
    }

    const ok = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash
    );
    if (!ok) return jsonError("Aktuelles Passwort ist falsch", 400);

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash },
    });

    return jsonOk({
      message:
        "Passwort aktualisiert. Bei der nächsten Anmeldung das neue Passwort verwenden.",
    });
  } catch (e) {
    return handleApiError(e);
  }
}
