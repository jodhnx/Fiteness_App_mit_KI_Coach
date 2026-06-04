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
import { AuthLog, logAuth } from "@/lib/auth-logger";

if (!process.env.AUTH_SECRET?.trim() && !process.env.NEXTAUTH_SECRET?.trim()) {
  console.error(
    AuthLog.AUTH_ERROR,
    "AUTH_SECRET fehlt — Sessions funktionieren nicht. Setze AUTH_SECRET in .env (min. 32 Zeichen)."
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
        const emailHint =
          typeof credentials?.email === "string"
            ? credentials.email.toLowerCase().trim()
            : "unknown";

        try {
          logAuth(AuthLog.LOGIN_ATTEMPT, { email: emailHint });

          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) {
            logAuth(AuthLog.AUTH_ERROR, {
              reason: "invalid_payload",
              issues: parsed.error.flatten().fieldErrors,
            });
            throw new InvalidCredentialsError();
          }

          const email = parsed.data.email.toLowerCase().trim();
          const limit = rateLimit(`login:${email}`, 10, 900_000);
          if (!limit.success) {
            logAuth(AuthLog.RATE_LIMITED, { email });
            throw new InvalidCredentialsError();
          }

          if (email === ADMIN_EMAIL) {
            try {
              await ensureAdminUser();
            } catch (e) {
              if (isDatabaseConnectionError(e)) throw new DatabaseConnectionError();
              throw e;
            }
          }

          const user = await dbQuery("auth.user.findUnique", (db) =>
            db.user.findUnique({ where: { email } })
          );

          if (!user?.passwordHash) {
            logAuth(AuthLog.USER_NOT_FOUND, { email });
            throw new InvalidCredentialsError();
          }

          logAuth(AuthLog.USER_FOUND, { id: user.id, role: user.role });

          const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
          if (!valid) {
            logAuth(AuthLog.PASSWORD_INVALID, { email });
            throw new InvalidCredentialsError();
          }

          logAuth(AuthLog.PASSWORD_VALID, { email });

          if (isEmailVerificationEnabled() && !isEmailVerified(user.emailVerified)) {
            logAuth(AuthLog.EMAIL_NOT_VERIFIED, { email });
            throw new UnverifiedEmailError();
          }

          logAuth(AuthLog.SESSION_CREATED, { userId: user.id, email });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          };
        } catch (error) {
          if (error instanceof InvalidCredentialsError) {
            logAuth(AuthLog.AUTH_ERROR, {
              reason: "invalid_credentials",
              email: emailHint,
            });
            throw error;
          }
          if (error instanceof UnverifiedEmailError) {
            logAuth(AuthLog.AUTH_ERROR, {
              reason: "email_not_verified",
              email: emailHint,
            });
            throw error;
          }
          if (error instanceof DatabaseConnectionError) {
            logAuth(AuthLog.DB_UNAVAILABLE, emailHint);
            throw error;
          }
          if (isDatabaseConnectionError(error)) {
            logAuth(AuthLog.DB_UNAVAILABLE, emailHint);
            throw new DatabaseConnectionError();
          }
          logAuth(AuthLog.AUTH_ERROR, {
            reason: "unexpected",
            email: emailHint,
            message: error instanceof Error ? error.message : String(error),
          });
          throw new InvalidCredentialsError();
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session?.onboardingComplete === true) {
        token.onboardingComplete = true;
      }
      const userId = user?.id ?? (token.id as string | undefined);
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      try {
        const userSelect = {
          id: true,
          role: true,
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
        } as const;

        const applyDbUser = (dbUser: {
          id: string;
          role: string;
          onboardingCompletedAt: Date | null;
          profile: {
            age: number | null;
            weightKg: number | null;
            heightCm: number | null;
            gender: string | null;
            activityLevel: string | null;
          } | null;
        }) => {
          token.id = dbUser.id;
          token.role = dbUser.role;
          const legacyComplete = Boolean(
            dbUser.profile?.age &&
              dbUser.profile.weightKg &&
              dbUser.profile.heightCm &&
              dbUser.profile.gender &&
              dbUser.profile.activityLevel
          );
          token.onboardingComplete =
            dbUser.role === "ADMIN" ||
            Boolean(dbUser.onboardingCompletedAt) ||
            legacyComplete;
          return { dbUser, legacyComplete };
        };

        if (userId) {
          const dbUser = await dbQuery("auth.jwt.userById", (db) =>
            db.user.findUnique({ where: { id: userId }, select: userSelect })
          );
          if (dbUser) {
            const { legacyComplete } = applyDbUser(dbUser);
            if (legacyComplete && !dbUser.onboardingCompletedAt) {
              await dbQuery("auth.jwt.completeOnboarding", (db) =>
                db.user.update({
                  where: { id: dbUser.id },
                  data: { onboardingCompletedAt: new Date() },
                })
              ).catch(() => undefined);
            }
          }
        } else if (token.email) {
          const dbUser = await dbQuery("auth.jwt.userByEmail", (db) =>
            db.user.findUnique({
              where: { email: token.email as string },
              select: userSelect,
            })
          );
          if (dbUser) applyDbUser(dbUser);
        }
      } catch (e) {
        if (isDatabaseConnectionError(e)) {
          logAuth(AuthLog.DB_UNAVAILABLE, "jwt callback");
        } else {
          console.error("[auth] jwt callback DB skipped", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = (token.role as string) ?? "USER";
        session.user.onboardingComplete = Boolean(token.onboardingComplete);
      }
      return session;
    },
  },
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
        console.error("[auth] signIn event failed (login continues)", e);
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
