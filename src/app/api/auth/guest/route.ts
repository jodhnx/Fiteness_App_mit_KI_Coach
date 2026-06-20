import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { createGuestUser } from "@/lib/guest-auth";
import { onboardingDraftSchema } from "@/lib/onboarding-draft-schema";

const bodySchema = z.object({
  onboarding: onboardingDraftSchema.optional(),
});

export async function POST(req: NextRequest) {
  try {
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
