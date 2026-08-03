import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { convertGuestToAccount } from "@/lib/guest-auth";
import { rateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const limit = rateLimit(`convert-guest:${session.user.id}`, 5, 3600_000);
    if (!limit.success) return jsonError("Zu viele Versuche", 429);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe", 400);

    const result = await convertGuestToAccount(session.user.id, parsed.data);
    if (!result.ok) return jsonError(result.error, result.status);

    return jsonOk({
      success: true,
      needsEmailVerification: result.needsEmailVerification,
      message: result.needsEmailVerification
        ? "Konto erstellt — bitte E-Mail bestätigen."
        : "Konto erfolgreich erstellt.",
    });
  } catch (e) {
    return handleApiError(e);
  }
}
