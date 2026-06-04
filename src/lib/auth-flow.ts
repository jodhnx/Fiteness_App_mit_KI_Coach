import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { getSession } from "next-auth/react";
import {
  DEFAULT_POST_LOGIN,
  resolvePostLoginPath,
} from "@/lib/auth-redirect";

export { DEFAULT_POST_LOGIN, resolvePostLoginPath };

/** Exact log lines requested for login debugging. */
export function logAuthFlow(step: string, detail?: unknown) {
  if (process.env.DEBUG_AUTH !== "1") return;
  if (detail !== undefined) {
    console.log(step, detail);
  } else {
    console.log(step);
  }
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
 * Navigates after login using a relative path only (never a full deployment URL).
 */
export async function redirectAfterLogin(
  router: AppRouterInstance,
  callbackUrl: string | null | undefined
): Promise<void> {
  const target = resolvePostLoginPath(callbackUrl);
  logAuthFlow("REDIRECTING TO DASHBOARD", target);

  if (typeof window !== "undefined") {
    if (target.startsWith("http://") || target.startsWith("https://")) {
      window.location.replace(DEFAULT_POST_LOGIN);
      return;
    }
    window.location.replace(target);
    return;
  }

  const hasSession = await waitForClientSession();
  logAuthFlow(hasSession ? "SESSION CREATED" : "DASHBOARD SESSION MISSING", target);
  router.replace(target);
  router.refresh();
}
