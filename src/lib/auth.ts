import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma, dbQuery } from "@/lib/prisma";
import { ensureAdminUser, ADMIN_EMAIL } from "@/lib/ensure-admin";
import { loginSchema } from "@/lib/validations";
import { authConfig } from "@/lib/auth.config";
import {
  isEmailVerified,
  isEmailVerificationEnabled,
} from "@/lib/verification";
import { isGuestEmail } from "@/lib/guest-auth";
import {
  DatabaseConnectionError,
  InvalidCredentialsError,
  UnverifiedEmailError,
} from "@/lib/auth-errors";
import { isDatabaseConnectionError } from "@/lib/prisma-errors";
import {
  flattenErrorMessage,
  getSafeDbConnectionMeta,
  isDatabaseConfigError,
} from "@/lib/database-url";
import { rateLimit } from "@/lib/security/rate-limit";
import { AuthLog, logAuth, logAuthServer, logAuthEnvOnce } from "@/lib/auth-logger";
import { looksLikeEphemeralDeploymentUrl } from "@/lib/auth-redirect";
import { handleJwtCallbackWithDb } from "@/lib/auth-jwt";

type LoginErrorClass =
  | "INVALID_CREDENTIALS"
  | "DATABASE_ERROR"
  | "AUTH_ERROR"
  | "USER_LOOKUP_ERROR"
  | "SESSION_ERROR"
  | "CONFIG_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

function isAuthInfrastructureError(error: unknown): boolean {
  return isDatabaseConnectionError(error) || isDatabaseConfigError(error);
}

function classifyLoginError(error: unknown): LoginErrorClass {
  if (error instanceof InvalidCredentialsError) return "INVALID_CREDENTIALS";
  if (error instanceof UnverifiedEmailError) return "AUTH_ERROR";
  if (error instanceof DatabaseConnectionError) return "DATABASE_ERROR";
  if (isDatabaseConfigError(error)) return "CONFIG_ERROR";
  if (isDatabaseConnectionError(error)) {
    const msg = flattenErrorMessage(error);
    if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|ECONNRESET|network/i.test(msg)) {
      return "NETWORK_ERROR";
    }
    return "DATABASE_ERROR";
  }
  return "UNKNOWN_ERROR";
}

function safeErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return undefined;
}

if (!process.env.AUTH_SECRET?.trim() && !process.env.NEXTAUTH_SECRET?.trim()) {
  logAuthServer("startup_error", {
    message:
      "AUTH_SECRET fehlt — Sessions funktionieren nicht. Setze AUTH_SECRET in Vercel (min. 32 Zeichen).",
  });
}

const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
if (nextAuthUrl && looksLikeEphemeralDeploymentUrl(nextAuthUrl)) {
  logAuthServer("startup_warning", {
    message:
      "NEXTAUTH_URL zeigt auf eine Preview-/Deployment-URL. Entfernen oder auf Produktions-Domain setzen — sonst DEPLOYMENT_NOT_FOUND nach Login.",
    nextAuthUrl: nextAuthUrl.slice(0, 120),
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    jwt: handleJwtCallbackWithDb,
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        logAuthEnvOnce();
        const correlationId = randomUUID();
        const emailHint =
          typeof credentials?.email === "string"
            ? credentials.email.toLowerCase().trim()
            : "unknown";

        const loginLog = (
          phase: string,
          detail?: Record<string, unknown>
        ) => {
          logAuthServer(phase, {
            correlationId,
            email: emailHint,
            ...detail,
          });
        };

        try {
          loginLog("LOGIN_START", {
            db: getSafeDbConnectionMeta(),
          });
          logAuth(AuthLog.LOGIN_ATTEMPT, { email: emailHint, correlationId });

          const parsed = loginSchema.safeParse(credentials);
          loginLog("parse_credentials", {
            success: parsed.success,
            issues: parsed.success ? undefined : parsed.error.flatten().fieldErrors,
          });

          if (!parsed.success) {
            loginLog("AUTH_FAILED", {
              errorClass: "INVALID_CREDENTIALS",
              reason: "invalid_payload",
              issues: parsed.error.flatten().fieldErrors,
            });
            throw new InvalidCredentialsError();
          }

          const email = parsed.data.email.toLowerCase().trim();
          const limit = rateLimit(`login:${email}`, 10, 900_000);
          if (!limit.success) {
            loginLog("AUTH_FAILED", {
              errorClass: "INVALID_CREDENTIALS",
              reason: "rate_limited",
            });
            throw new InvalidCredentialsError();
          }

          // Bootstrap admin only when missing — never resets password (see ensure-admin.ts)
          if (email === ADMIN_EMAIL && process.env.ADMIN_BOOTSTRAP_ON_LOGIN === "1") {
            try {
              await ensureAdminUser();
              loginLog("admin_ensure", { ok: true });
            } catch (e) {
              if (isAuthInfrastructureError(e)) {
                loginLog("AUTH_FAILED", {
                  errorClass: classifyLoginError(e),
                  reason: "database_connection",
                  during: "ensure_admin",
                  errorCode: safeErrorCode(e),
                  safeMessage: flattenErrorMessage(e).slice(0, 300),
                });
                throw new DatabaseConnectionError();
              }
              loginLog("admin_ensure", {
                ok: false,
                safeMessage: flattenErrorMessage(e).slice(0, 300),
              });
            }
          }

          let user: {
            id: string;
            email: string;
            name: string | null;
            image: string | null;
            role: string;
            passwordHash: string | null;
            emailVerified: Date | null;
          } | null = null;

          try {
            user = await dbQuery("auth.user.findUnique", (db) =>
              db.user.findUnique({ where: { email } })
            );
            loginLog(user ? "USER_LOOKUP_SUCCESS" : "USER_LOOKUP_FAILED", {
              found: Boolean(user),
              hasPasswordHash: Boolean(user?.passwordHash),
              emailVerified: user?.emailVerified?.toISOString() ?? null,
              userId: user?.id ?? null,
            });
          } catch (e) {
            loginLog("USER_LOOKUP_FAILED", {
              errorClass: classifyLoginError(e),
              reason: "database_connection",
              during: "user_lookup",
              errorCode: safeErrorCode(e),
              errorType: e instanceof Error ? e.name : typeof e,
              safeMessage: flattenErrorMessage(e).slice(0, 400),
            });
            if (isAuthInfrastructureError(e)) throw new DatabaseConnectionError();
            throw e;
          }

          if (!user?.passwordHash) {
            loginLog("AUTH_FAILED", {
              errorClass: "INVALID_CREDENTIALS",
              reason: "user_not_found_or_no_password",
              userFound: Boolean(user),
            });
            throw new InvalidCredentialsError();
          }

          logAuth(AuthLog.USER_FOUND, { id: user.id, role: user.role });

          const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
          loginLog("password_check", { valid });

          if (!valid) {
            loginLog("AUTH_FAILED", {
              errorClass: "INVALID_CREDENTIALS",
              reason: "password_invalid",
            });
            throw new InvalidCredentialsError();
          }

          loginLog("AUTH_SUCCESS", { userId: user.id, role: user.role });

          const verificationRequired = isEmailVerificationEnabled();
          const verified = isEmailVerified(user.emailVerified);
          loginLog("email_verification_check", {
            verificationRequired,
            verified,
          });

          if (verificationRequired && !verified && !isGuestEmail(email)) {
            loginLog("AUTH_FAILED", {
              errorClass: "AUTH_ERROR",
              reason: "email_not_verified",
            });
            throw new UnverifiedEmailError();
          }

          loginLog("SESSION_SUCCESS", {
            userId: user.id,
            role: user.role,
          });
          logAuth(AuthLog.SESSION_CREATED, { userId: user.id, email });

          loginLog("LOGIN_COMPLETE", {
            userId: user.id,
            role: user.role,
          });

          return {
            id: user.id,
            email: user.email,
            role: String(user.role),
          };
        } catch (error) {
          const errorClass = classifyLoginError(error);
          if (error instanceof InvalidCredentialsError) {
            loginLog("authorize_throw", {
              errorClass,
              code: error.code,
              type: "InvalidCredentialsError",
            });
            throw error;
          }
          if (error instanceof UnverifiedEmailError) {
            loginLog("authorize_throw", {
              errorClass,
              code: error.code,
              type: "UnverifiedEmailError",
            });
            throw error;
          }
          if (error instanceof DatabaseConnectionError) {
            loginLog("authorize_throw", {
              errorClass,
              code: error.code,
              type: "DatabaseConnectionError",
            });
            throw error;
          }
          if (isAuthInfrastructureError(error)) {
            loginLog("SESSION_FAILED", {
              errorClass,
              code: "database_connection",
              type: "DatabaseConnectionError",
              errorCode: safeErrorCode(error),
              errorType: error instanceof Error ? error.name : typeof error,
              safeMessage: flattenErrorMessage(error).slice(0, 400),
            });
            throw new DatabaseConnectionError();
          }

          loginLog("SESSION_FAILED", {
            errorClass,
            reason: "unexpected",
            errorCode: safeErrorCode(error),
            errorType: error instanceof Error ? error.name : typeof error,
            safeMessage: flattenErrorMessage(error).slice(0, 400),
            stack:
              error instanceof Error
                ? error.stack?.split("\n").slice(0, 4)
                : undefined,
          });
          // Do not mask infra failures as wrong password
          throw new InvalidCredentialsError();
        }
      },
    }),
  ],
  events: {
    async signIn({ user, account }) {
      try {
        if (user.id && account?.provider === "google") {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              emailVerified: new Date(),
              verificationCode: null,
              verificationExpires: null,
            },
          });
          const hasProfile = await prisma.profile.findFirst({
            where: {
              userId: user.id,
              age: { not: null },
              nutritionGoal: { not: null },
            },
          });
          if (hasProfile) {
            await prisma.user.update({
              where: { id: user.id },
              data: { onboardingCompletedAt: new Date() },
            });
          }
        }
        // Optional activity log — must never fail login
        if (user.id) {
          await prisma.activityLog
            .create({
              data: { userId: user.id, action: "LOGIN" },
            })
            .catch((e) => {
              logAuthServer("signin_event_optional_failed", {
                safeMessage: flattenErrorMessage(e).slice(0, 200),
              });
            });
        }
      } catch (e) {
        logAuthServer("signin_event_error", {
          safeMessage: flattenErrorMessage(e).slice(0, 300),
        });
      }
    },
  },
});

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return session;
}
