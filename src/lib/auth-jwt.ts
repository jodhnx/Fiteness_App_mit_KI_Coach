import type { User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { dbQuery } from "@/lib/prisma";
import { logAuthServer } from "@/lib/auth-logger";
import { buildSlimJwt, handleJwtCallbackEdge } from "@/lib/auth-jwt-edge";

export { buildSlimJwt, buildSlimSession, handleSessionCallback } from "@/lib/auth-jwt-edge";

export async function resolveOnboardingComplete(
  userId: string,
  role?: string | null
): Promise<boolean> {
  if (role === "ADMIN") return true;

  const dbUser = await dbQuery("auth.onboardingStatus", (db) =>
    db.user.findUnique({
      where: { id: userId },
      select: {
        onboardingCompletedAt: true,
        profile: {
          select: {
            age: true,
            weightKg: true,
            heightCm: true,
            gender: true,
            activityLevel: true,
          },
        },
      },
    })
  );

  if (!dbUser) return false;
  if (dbUser.onboardingCompletedAt) return true;

  const p = dbUser.profile;
  const legacyComplete = Boolean(
    p?.age && p.weightKg && p.heightCm && p.gender && p.activityLevel
  );

  if (legacyComplete && !dbUser.onboardingCompletedAt) {
    await dbQuery("auth.completeOnboarding", (db) =>
      db.user.update({
        where: { id: userId },
        data: { onboardingCompletedAt: new Date() },
      })
    ).catch(() => undefined);
  }

  return legacyComplete;
}

type JwtCallbackParams = {
  token: JWT;
  user?: User | null;
  trigger?: "signIn" | "signUp" | "update";
  session?: { onboardingComplete?: boolean };
};

export async function handleJwtCallbackWithDb(
  params: JwtCallbackParams
): Promise<JWT> {
  const { user, token } = params;

  try {
    if (user?.id) {
      const role = (user as { role?: string }).role ?? "USER";
      let onboardingComplete = role === "ADMIN";
      try {
        onboardingComplete = await resolveOnboardingComplete(user.id, role);
      } catch (e) {
        logAuthServer("jwt_onboarding_lookup_failed", {
          userId: user.id,
          message: e instanceof Error ? e.message : String(e),
        });
      }
      return buildSlimJwt({
        id: user.id,
        email: user.email,
        role,
        onboardingComplete,
        iat: token.iat,
        exp: token.exp,
        jti: token.jti,
      });
    }
  } catch (e) {
    logAuthServer("jwt_callback_error", {
      message: e instanceof Error ? e.message : String(e),
    });
  }

  return handleJwtCallbackEdge(params);
}
