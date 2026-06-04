import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/reset-password",
  "/verify-email",
];

const onboardingExempt = ["/onboarding", "/api/onboarding"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const path = nextUrl.pathname;
  const isPublic = publicRoutes.includes(path);
  const onboardingComplete = req.auth?.user?.onboardingComplete === true;
  const isApiAuth = path.startsWith("/api/auth");
  const isApiRegister = path.startsWith("/api/register");
  const isApiVerify = path.startsWith("/api/verify-email");
  const isApiReset = path.startsWith("/api/reset-password");
  const publicApi =
    isApiAuth ||
    isApiRegister ||
    isApiVerify ||
    isApiReset ||
    path.startsWith("/api/health");

  if (path.startsWith("/api/") && !publicApi && !isLoggedIn) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  if (isLoggedIn && (path === "/login" || path === "/register")) {
    return NextResponse.redirect(new URL("/home", nextUrl));
  }

  if (!isPublic && !isLoggedIn && !path.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && onboardingComplete && path === "/onboarding") {
    return NextResponse.redirect(new URL("/home", nextUrl));
  }

  if (
    isLoggedIn &&
    !onboardingComplete &&
    !onboardingExempt.some((p) => path === p || path.startsWith(`${p}/`)) &&
    !isPublic &&
    !path.startsWith("/api/auth")
  ) {
    if (path.startsWith("/api/") && !path.startsWith("/api/onboarding")) {
      return NextResponse.json(
        { error: "Onboarding erforderlich", code: "ONBOARDING_REQUIRED" },
        { status: 403 }
      );
    }
    if (!path.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
  }

  if (path.startsWith("/admin") && req.auth?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/home", nextUrl));
  }

  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
