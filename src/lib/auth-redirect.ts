/**
 * Post-login redirects: same-origin /home via trustHost baseUrl (absolute URL for NextAuth client).
 * Auth/logout destinations (/login, /register, …) must NOT be rewritten to /home.
 */
import { logAuthServer } from "@/lib/auth-logger";

export const DEFAULT_POST_LOGIN = "/home";

const AUTH_PUBLIC_PATHS = [
  "/login",
  "/register",
  "/reset-password",
  "/verify-email",
] as const;

export function resolvePostLoginPath(_input?: string | null): string {
  return DEFAULT_POST_LOGIN;
}

function resolveAllowedAuthPath(url: string, baseUrl: string): string | null {
  try {
    const base = baseUrl.replace(/\/$/, "");
    const resolved = new URL(url, baseUrl);
    // Same-origin only
    if (new URL(baseUrl).origin !== resolved.origin) return null;
    const path = resolved.pathname.replace(/\/$/, "") || "/";
    if (AUTH_PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
      return `${base}${path}${resolved.search}${resolved.hash}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * NextAuth redirect callback — absolute URL on current host (trustHost baseUrl).
 * Relative-only URLs break next-auth/react signIn() which does `new URL(data.url)`.
 */
export function safeAuthRedirect({
  url,
  baseUrl,
}: {
  url: string;
  baseUrl: string;
}): string {
  // Logout / auth screens must keep their destination (was always forced to /home).
  if (url && baseUrl) {
    const allowed = resolveAllowedAuthPath(url, baseUrl);
    if (allowed) {
      if (looksLikeEphemeralDeploymentUrl(baseUrl)) {
        // Still return relative path so client can navigate without bad host
        try {
          return new URL(allowed).pathname + new URL(allowed).search;
        } catch {
          return "/login";
        }
      }
      return allowed;
    }
  }

  const path = DEFAULT_POST_LOGIN;

  if (url && looksLikeEphemeralDeploymentUrl(url)) {
    logAuthServer("redirect_blocked", {
      reason: "ephemeral_url_param",
      url: url.slice(0, 240),
      baseUrl: baseUrl.slice(0, 240),
    });
  }

  if (!baseUrl || looksLikeEphemeralDeploymentUrl(baseUrl)) {
    logAuthServer("redirect_fallback_relative", {
      reason: "unsafe_base_url",
      baseUrl: baseUrl?.slice(0, 240) ?? null,
      path,
    });
    return path;
  }

  const base = baseUrl.replace(/\/$/, "");
  return `${base}${path}`;
}

/** Preview / per-deployment URLs — unsuitable for NEXTAUTH_URL. */
export function looksLikeEphemeralDeploymentUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("---")) return true;
    if (/^[a-z0-9-]+-[a-z0-9]{20,}\.vercel\.app$/i.test(host)) return true;
  } catch {
    return false;
  }
  return false;
}

/** Server-side base URL for e-mails (reset password). Prefer stable production domain. */
export function getServerAuthBaseUrl(): string {
  const production =
    process.env.AUTH_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, "")}`
      : "");

  if (production) return production.replace(/\/$/, "");

  const nextAuth = process.env.NEXTAUTH_URL?.trim();
  if (nextAuth && !looksLikeEphemeralDeploymentUrl(nextAuth)) {
    return nextAuth.replace(/\/$/, "");
  }

  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}
