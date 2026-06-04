/**
 * Safe post-login paths only — never redirect to external or stale Vercel deployment URLs.
 */
export const DEFAULT_POST_LOGIN = "/home";

const BLOCKED_PREFIXES = [
  "/login",
  "/register",
  "/reset-password",
  "/verify-email",
  "/api/",
];

/** Internal path only (e.g. /home, /profile). */
export function resolvePostLoginPath(input: string | null | undefined): string {
  if (!input?.trim()) return DEFAULT_POST_LOGIN;

  let raw = input.trim();

  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const parsed = new URL(raw);
      raw = parsed.pathname + parsed.search;
    } catch {
      return DEFAULT_POST_LOGIN;
    }
  }

  if (!raw.startsWith("/")) raw = `/${raw}`;
  if (raw.startsWith("//") || raw.includes("://") || raw.toLowerCase().includes("vercel.app")) {
    return DEFAULT_POST_LOGIN;
  }

  const pathOnly = raw.split("?")[0];
  if (BLOCKED_PREFIXES.some((p) => pathOnly === p || pathOnly.startsWith(p))) {
    return DEFAULT_POST_LOGIN;
  }

  if (pathOnly === "/dashboard" || raw.startsWith("/dashboard?")) {
    return raw.replace(/^\/dashboard/, "/home");
  }

  return raw;
}

/**
 * NextAuth redirect callback — always same-origin + sanitized path (fixes stale NEXTAUTH_URL).
 */
export function safeAuthRedirect({
  url,
  baseUrl,
}: {
  url: string;
  baseUrl: string;
}): string {
  const path = resolvePostLoginPath(url);
  const base = baseUrl.replace(/\/$/, "");
  return `${base}${path}`;
}

/** Server-side base URL for e-mails (reset password). Prefer production URL, not preview. */
export function getServerAuthBaseUrl(): string {
  const explicit =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "");

  if (explicit) return explicit.replace(/\/$/, "");

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}
