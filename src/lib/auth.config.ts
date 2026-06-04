import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
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
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const publicRoutes = [
        "/",
        "/login",
        "/register",
        "/reset-password",
        "/verify-email",
      ];
      if (publicRoutes.includes(path)) return true;
      if (path.startsWith("/api/health")) return true;
      if (
        path.startsWith("/api/register") ||
        path.startsWith("/api/verify-email") ||
        path.startsWith("/api/reset-password")
      )
        return true;
      if (path.startsWith("/api/auth")) return true;
      return isLoggedIn;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
        if ((user as { role?: string }).role === "ADMIN") {
          token.onboardingComplete = true;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = (token.role as string) ?? "USER";
        session.user.onboardingComplete =
          token.role === "ADMIN" || Boolean(token.onboardingComplete);
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
};
