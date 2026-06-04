import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { getSession } from "next-auth/react";

const DEFAULT_POST_LOGIN = "/home";

/** Exact log lines requested for login debugging. */
export function logAuthFlow(step: string, detail?: unknown) {
  if (process.env.DEBUG_AUTH !== "1") return;
  if (detail !== undefined) {
    console.log(step, detail);
  } else {
    console.log(step);
  }
}

/** Safe internal path after login; `/dashboard` maps to `/home`. */
export function resolvePostLoginPath(callbackUrl: string | null | undefined): string {
  if (!callbackUrl?.trim()) return DEFAULT_POST_LOGIN;

  let path = callbackUrl.trim();

  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const url = new URL(path);
      path = url.pathname + url.search;
    } catch {
      return DEFAULT_POST_LOGIN;
    }
  }

  if (!path.startsWith("/")) path = `/${path}`;

  const blocked = ["/login", "/register", "/reset-password", "/verify-email"];
  if (blocked.includes(path.split("?")[0])) return DEFAULT_POST_LOGIN;

  if (path === "/dashboard" || path.startsWith("/dashboard?")) {
    return path.replace(/^\/dashboard/, "/home");
  }

  return path;
}

export async function waitForClientSession(timeoutMs = 1500): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const session = await getSession();
    if (session?.user?.id) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

/**
 * Navigates immediately after login (hard redirect) so the UI does not wait on session polling.
 */
export async function redirectAfterLogin(
  router: AppRouterInstance,
  callbackUrl: string | null | undefined
): Promise<void> {
  const target = resolvePostLoginPath(callbackUrl);
  logAuthFlow("REDIRECTING TO DASHBOARD", target);

  if (typeof window !== "undefined") {
    window.location.replace(target);
    return;
  }

  const hasSession = await waitForClientSession();
  logAuthFlow(hasSession ? "SESSION CREATED" : "DASHBOARD SESSION MISSING", target);
  router.replace(target);
  router.refresh();
}
