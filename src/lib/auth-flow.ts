import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { getSession } from "next-auth/react";
import {
  DEFAULT_POST_LOGIN,
  resolvePostLoginPath,
} from "@/lib/auth-redirect";

export { DEFAULT_POST_LOGIN, resolvePostLoginPath };

/** Client-side flow logging (browser console). */
export function logAuthFlow(step: string, detail?: unknown) {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEBUG_AUTH !== "1") {
    return;
  }
  if (detail !== undefined) {
    console.log(`[auth-flow] ${step}`, detail);
  } else {
    console.log(`[auth-flow] ${step}`);
  }
}

export async function waitForClientSession(timeoutMs = 2000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const session = await getSession();
    if (session?.user?.id) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

/**
 * Navigates after login — always same-origin /home (never a full deployment URL).
 */
export async function redirectAfterLogin(
  router: AppRouterInstance,
  _callbackUrl?: string | null
): Promise<void> {
  const target = DEFAULT_POST_LOGIN;
  logAuthFlow("redirect_after_login", target);

  if (typeof window !== "undefined") {
    window.location.replace(target);
    return;
  }

  const hasSession = await waitForClientSession();
  logAuthFlow(hasSession ? "session_ready" : "session_missing", target);
  router.replace(target);
  router.refresh();
}
