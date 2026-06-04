/**
 * Post-login redirects: always same-origin /home, never stale Vercel deployment URLs.
 */
import { logAuthServer } from "@/lib/auth-logger";

export const DEFAULT_POST_LOGIN = "/home";

/**
 * After successful login always /home (ignores callbackUrl and external URLs).
 */
export function resolvePostLoginPath(_input?: string | null): string {
  return DEFAULT_POST_LOGIN;
}

/**
 * NextAuth redirect callback — **relative path only** (stays on current host; trustHost).
 */
export function safeAuthRedirect({
  url,
  baseUrl,
}: {
  url: string;
  baseUrl: string;
}): string {
  if (url && looksLikeEphemeralDeploymentUrl(url)) {
    logAuthServer("redirect_blocked", {
      reason: "ephemeral_url_param",
      url: url.slice(0, 240),
      baseUrl: baseUrl.slice(0, 240),
      fallback: DEFAULT_POST_LOGIN,
    });
  } else if (baseUrl && looksLikeEphemeralDeploymentUrl(baseUrl)) {
    logAuthServer("redirect_blocked", {
      reason: "ephemeral_base_url",
      baseUrl: baseUrl.slice(0, 240),
      fallback: DEFAULT_POST_LOGIN,
    });
  }

  return DEFAULT_POST_LOGIN;
}

/** Preview / per-deployment URLs — unsuitable for redirects or NEXTAUTH_URL. */
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
