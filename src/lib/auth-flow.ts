import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { getSession } from "next-auth/react";
import {
  DEFAULT_POST_LOGIN,
  resolvePostLoginPath,
} from "@/lib/auth-redirect";

export { DEFAULT_POST_LOGIN, resolvePostLoginPath };

export type CredentialsSignInResult = {
  ok: boolean;
  error?: string;
  code?: string;
  status: number;
  url?: string | null;
};

/** Client-side flow logging (browser console). */
export function logAuthFlow(step: string, detail?: unknown) {
  const debug =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_DEBUG_AUTH === "1";
  if (!debug) return;
  if (detail !== undefined) {
    console.log(`[auth-flow] ${step}`, detail);
  } else {
    console.log(`[auth-flow] ${step}`);
  }
}

function parseAuthRedirectUrl(
  redirectUrl: string | undefined
): { error?: string; code?: string } {
  if (!redirectUrl?.trim()) return {};
  try {
    const parsed = redirectUrl.startsWith("http")
      ? new URL(redirectUrl)
      : new URL(redirectUrl, window.location.origin);
    return {
      error: parsed.searchParams.get("error") ?? undefined,
      code: parsed.searchParams.get("code") ?? undefined,
    };
  } catch (e) {
    console.log("LOGIN ERROR parse redirect url", redirectUrl, e);
    return {};
  }
}

/**
 * Credentials login compatible with next-auth v5 — safe parsing of relative redirect URLs.
 * (Built-in signIn() throws `Invalid URL` when the server returns `/home`.)
 */
export async function signInCredentials(
  email: string,
  password: string,
  callbackUrl: string = DEFAULT_POST_LOGIN
): Promise<CredentialsSignInResult> {
  const basePath = "/api/auth";
  const csrfRes = await fetch(`${basePath}/csrf`, { credentials: "include" });
  if (!csrfRes.ok) {
    return {
      ok: false,
      error: "csrf_failed",
      code: "csrf_failed",
      status: csrfRes.status,
    };
  }
  const csrfJson = (await csrfRes.json()) as { csrfToken?: string };
  const csrfToken = csrfJson.csrfToken ?? "";

  const res = await fetch(`${basePath}/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
    },
    credentials: "include",
    body: new URLSearchParams({
      email,
      password,
      csrfToken,
      callbackUrl,
    }),
  });

  let data: { url?: string } = {};
  try {
    data = await res.json();
  } catch (e) {
    console.log("LOGIN ERROR invalid auth json", e);
    return {
      ok: false,
      error: "invalid_response",
      code: "invalid_response",
      status: res.status,
    };
  }

  const { error, code } = parseAuthRedirectUrl(data.url);

  if (res.ok && !error) {
    await getSession();
  }

  logAuthFlow("signInCredentials", {
    ok: res.ok && !error,
    status: res.status,
    error,
    code,
    url: data.url,
  });

  return {
    ok: res.ok && !error,
    error,
    code,
    status: res.status,
    url: error ? null : data.url ?? null,
  };
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
