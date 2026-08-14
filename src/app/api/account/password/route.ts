import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { rateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

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
      return jsonError("Neues Passwort muss mindestens 8 Zeichen haben", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true, isGuest: true },
    });
    if (!user?.passwordHash || user.isGuest) {
      return jsonError("Passwortänderung für dieses Konto nicht möglich", 400);
    }

    const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!ok) return jsonError("Aktuelles Passwort ist falsch", 400);

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash },
    });

    return jsonOk({ message: "Passwort aktualisiert" });
  } catch (e) {
    return handleApiError(e);
  }
}
