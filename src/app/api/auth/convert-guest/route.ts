import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { convertGuestToAccount } from "@/lib/guest-auth";
import { isEmailVerificationEnabled } from "@/lib/verification";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe", 400);

    const result = await convertGuestToAccount(session.user.id, parsed.data);
    if (!result.ok) return jsonError(result.error, result.status);

    const needsVerify = isEmailVerificationEnabled();
    return jsonOk({
      success: true,
      needsEmailVerification: needsVerify,
      message: needsVerify
        ? "Konto erstellt. Bitte E-Mail bestätigen."
        : "Konto erfolgreich erstellt.",
    });
  } catch (e) {
    return handleApiError(e);
  }
}
