import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { safeAuthRedirect } from "@/lib/auth-redirect";
import {
  handleJwtCallbackEdge,
  handleSessionCallback,
} from "@/lib/auth-jwt-edge";

const useSecureCookies = process.env.NODE_ENV === "production";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  debug: process.env.AUTH_DEBUG === "1",
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: useSecureCookies
        ? "__Secure-authjs.session-token.v2"
        : "authjs.session-token.v2",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Require explicit verified linking — avoids account takeover via email match
      allowDangerousEmailAccountLinking: false,
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
    redirect: safeAuthRedirect,
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
      if (path === "/api/health") return true;
      if (path.startsWith("/api/wearables/oauth/")) return true;
      if (
        path.startsWith("/api/register") ||
        path.startsWith("/api/verify-email") ||
        path.startsWith("/api/reset-password")
      )
        return true;
      if (path.startsWith("/api/auth")) return true;
      return isLoggedIn;
    },
    jwt: handleJwtCallbackEdge,
    session: handleSessionCallback,
  },
};
