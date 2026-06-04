import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

/** JWT payload — minimal fields only (Edge-safe, no DB). */
export function buildSlimJwt(
  input: Partial<JWT> & { id: string; email?: string | null }
): JWT {
  const id = input.id;
  return {
    sub: id,
    id,
    email: input.email ?? undefined,
    role: (input.role as string) ?? "USER",
    onboardingComplete: Boolean(input.onboardingComplete),
    iat: input.iat,
    exp: input.exp,
    jti: input.jti,
  };
}

export function buildSlimSession(token: JWT): Session {
  const id = (token.id as string) ?? (token.sub as string) ?? "";
  const expMs = token.exp
    ? token.exp * 1000
    : Date.now() + 30 * 24 * 60 * 60 * 1000;
  return {
    expires: new Date(expMs).toISOString(),
    user: {
      id,
      email: (token.email as string) ?? "",
      role: (token.role as string) ?? "USER",
      onboardingComplete: Boolean(token.onboardingComplete),
    },
  };
}

type JwtCallbackParams = {
  token: JWT;
  user?: User | null;
  trigger?: "signIn" | "signUp" | "update";
  session?: { onboardingComplete?: boolean };
};

/** Middleware / auth.config — never touches the database. */
export function handleJwtCallbackEdge({
  token,
  user,
  trigger,
  session: sessionUpdate,
}: JwtCallbackParams): JWT {
  if (user?.id) {
    const role = (user as { role?: string }).role ?? "USER";
    return buildSlimJwt({
      id: user.id,
      email: user.email,
      role,
      onboardingComplete: role === "ADMIN",
      iat: token.iat,
      exp: token.exp,
      jti: token.jti,
    });
  }

  if (trigger === "update" && sessionUpdate?.onboardingComplete === true) {
    const id = (token.id ?? token.sub) as string;
    return buildSlimJwt({
      id,
      email: token.email as string | undefined,
      role: (token.role as string) ?? "USER",
      onboardingComplete: true,
      iat: token.iat,
      exp: token.exp,
      jti: token.jti,
    });
  }

  const id = (token.id ?? token.sub) as string;
  return buildSlimJwt({
    id,
    email: token.email as string | undefined,
    role: (token.role as string) ?? "USER",
    onboardingComplete: token.onboardingComplete,
    iat: token.iat,
    exp: token.exp,
    jti: token.jti,
  });
}

export function handleSessionCallback({
  token,
}: {
  session: Session;
  token: JWT;
}): Session {
  return buildSlimSession(token);
}
