import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma, dbQuery } from "@/lib/prisma";
import { ensureAdminUser, ADMIN_EMAIL } from "@/lib/ensure-admin";
import { loginSchema } from "@/lib/validations";
import { authConfig } from "@/lib/auth.config";
import {
  isEmailVerified,
  isEmailVerificationEnabled,
} from "@/lib/verification";
import {
  DatabaseConnectionError,
  InvalidCredentialsError,
  UnverifiedEmailError,
} from "@/lib/auth-errors";
import { isDatabaseConnectionError } from "@/lib/prisma-errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { AuthLog, logAuth, logAuthServer, logAuthEnvOnce } from "@/lib/auth-logger";
import { looksLikeEphemeralDeploymentUrl } from "@/lib/auth-redirect";
import { handleJwtCallbackWithDb } from "@/lib/auth-jwt";

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
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        logAuthEnvOnce();
        const emailHint =
          typeof credentials?.email === "string"
            ? credentials.email.toLowerCase().trim()
            : "unknown";

        try {
          logAuthServer("login_attempt", { email: emailHint });
          logAuth(AuthLog.LOGIN_ATTEMPT, { email: emailHint });

          const parsed = loginSchema.safeParse(credentials);
          logAuthServer("parse_credentials", {
            email: emailHint,
            success: parsed.success,
            issues: parsed.success ? undefined : parsed.error.flatten().fieldErrors,
          });

          if (!parsed.success) {
            logAuthServer("login_failed", {
              email: emailHint,
              reason: "invalid_payload",
              issues: parsed.error.flatten().fieldErrors,
            });
            throw new InvalidCredentialsError();
          }

          const email = parsed.data.email.toLowerCase().trim();
          const limit = rateLimit(`login:${email}`, 10, 900_000);
          if (!limit.success) {
            logAuthServer("login_failed", { email, reason: "rate_limited" });
            throw new InvalidCredentialsError();
          }

          if (email === ADMIN_EMAIL) {
            try {
              await ensureAdminUser();
              logAuthServer("admin_ensure", { email, ok: true });
            } catch (e) {
              if (isDatabaseConnectionError(e)) {
                logAuthServer("login_failed", {
                  email,
                  reason: "database_connection",
                  during: "ensure_admin",
                  message: e instanceof Error ? e.message : String(e),
                });
                throw new DatabaseConnectionError();
              }
              logAuthServer("login_failed", {
                email,
                reason: "ensure_admin_error",
                message: e instanceof Error ? e.message : String(e),
              });
              throw e;
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
            logAuthServer("db_user_lookup", {
              email,
              found: Boolean(user),
              hasPasswordHash: Boolean(user?.passwordHash),
              emailVerified: user?.emailVerified?.toISOString() ?? null,
            });
          } catch (e) {
            logAuthServer("login_failed", {
              email,
              reason: "database_connection",
              during: "user_lookup",
              message: e instanceof Error ? e.message : String(e),
              prismaCode:
                e && typeof e === "object" && "code" in e
                  ? String((e as { code: unknown }).code)
                  : undefined,
            });
            if (isDatabaseConnectionError(e)) throw new DatabaseConnectionError();
            throw e;
          }

          if (!user?.passwordHash) {
            console.log("USER FOUND", user ? { id: user.id, email: user.email } : null);
            console.log("PASSWORD VALID", false);
            console.log("EMAIL VERIFIED", user?.emailVerified ?? null);
            logAuthServer("login_failed", {
              email,
              reason: "user_not_found_or_no_password",
              userFound: Boolean(user),
            });
            throw new InvalidCredentialsError();
          }

          console.log("USER FOUND", {
            id: user.id,
            email: user.email,
            role: user.role,
            hasPasswordHash: true,
          });
          logAuth(AuthLog.USER_FOUND, { id: user.id, role: user.role });

          const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
          console.log("PASSWORD VALID", valid);
          logAuthServer("password_check", { email, valid });

          if (!valid) {
            console.log("EMAIL VERIFIED", user.emailVerified);
            logAuthServer("login_failed", { email, reason: "password_invalid" });
            throw new InvalidCredentialsError();
          }

          const verificationRequired = isEmailVerificationEnabled();
          const verified = isEmailVerified(user.emailVerified);
          console.log("EMAIL VERIFIED", user.emailVerified);
          logAuthServer("email_verification_check", {
            email,
            verificationRequired,
            verified,
          });

          if (verificationRequired && !verified) {
            logAuthServer("login_failed", {
              email,
              reason: "email_not_verified",
            });
            throw new UnverifiedEmailError();
          }

          logAuthServer("login_success", {
            userId: user.id,
            email,
            role: user.role,
          });
          logAuth(AuthLog.SESSION_CREATED, { userId: user.id, email });

          return {
            id: user.id,
            email: user.email,
            role: String(user.role),
          };
        } catch (error) {
          console.log("LOGIN ERROR", error);
          if (error instanceof InvalidCredentialsError) {
            logAuthServer("authorize_throw", {
              email: emailHint,
              code: error.code,
              type: "InvalidCredentialsError",
            });
            throw error;
          }
          if (error instanceof UnverifiedEmailError) {
            logAuthServer("authorize_throw", {
              email: emailHint,
              code: error.code,
              type: "UnverifiedEmailError",
            });
            throw error;
          }
          if (error instanceof DatabaseConnectionError) {
            logAuthServer("authorize_throw", {
              email: emailHint,
              code: error.code,
              type: "DatabaseConnectionError",
            });
            throw error;
          }
          if (isDatabaseConnectionError(error)) {
            logAuthServer("authorize_throw", {
              email: emailHint,
              code: "database_connection",
              type: "DatabaseConnectionError",
              message: error instanceof Error ? error.message : String(error),
            });
            throw new DatabaseConnectionError();
          }

          logAuthServer("login_failed", {
            email: emailHint,
            reason: "unexpected",
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack?.split("\n").slice(0, 4) : undefined,
          });
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
        if (user.id) {
          await prisma.activityLog
            .create({
              data: { userId: user.id, action: "LOGIN" },
            })
            .catch(() => undefined);
        }
      } catch (e) {
        logAuthServer("signin_event_error", {
          message: e instanceof Error ? e.message : String(e),
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
