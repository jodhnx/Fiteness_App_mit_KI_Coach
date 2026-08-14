import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { rateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  password: z.string().min(1),
  confirm: z.literal("LÖSCHEN"),
});

/**
 * Permanently delete the authenticated user and cascaded data.
 * Requires password + typing LÖSCHEN.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const limit = rateLimit(`acct-del:${session.user.id}`, 3, 3600_000);
    if (!limit.success) return jsonError("Zu viele Versuche", 429);

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Zur Bestätigung Passwort und „LÖSCHEN“ eingeben', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true, role: true, isGuest: true },
    });
    if (!user) return jsonError("Konto nicht gefunden", 404);
    if (user.role === "ADMIN") {
      return jsonError("Admin-Konten können hier nicht gelöscht werden", 403);
    }

    if (user.passwordHash) {
      const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!ok) return jsonError("Passwort ist falsch", 400);
    } else if (!user.isGuest) {
      return jsonError("Passwort erforderlich", 400);
    }

    await prisma.user.delete({ where: { id: user.id } });
    return jsonOk({ message: "Konto gelöscht" });
  } catch (e) {
    return handleApiError(e);
  }
}
