import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { createGuestUser } from "@/lib/guest-auth";
import { onboardingDraftSchema } from "@/lib/onboarding-draft-schema";
import { rateLimit } from "@/lib/security/rate-limit";

const bodySchema = z.object({
  onboarding: onboardingDraftSchema.optional(),
});

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.DISABLE_GUEST_MODE === "1") {
      return jsonError("Gastmodus ist deaktiviert", 403);
    }

    const ip = clientIp(req);
    const limit = rateLimit(`guest:${ip}`, 5, 60 * 60_000);
    if (!limit.success) {
      return jsonError("Zu viele Gastkonten. Bitte später erneut versuchen.", 429);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe", 400);

    const { user, password } = await createGuestUser(parsed.data.onboarding ?? null);

    return jsonOk(
      {
        userId: user.id,
        email: user.email,
        password,
        isGuest: true,
      },
      201
    );
  } catch (e) {
    return handleApiError(e);
  }
}
