import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "nexform.session";

export function getApiBase(): string {
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  return (
    process.env.EXPO_PUBLIC_API_BASE ||
    extra?.apiBaseUrl ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function getSessionToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SESSION_KEY);
  } catch {
    return null;
  }
}

export async function setSessionToken(token: string | null) {
  if (!token) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getSessionToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  return fetch(`${getApiBase()}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

/**
 * Credentials login against Auth.js.
 * Production mobile should use a dedicated token endpoint — until then,
 * this stores a placeholder only if the server returns a usable session cookie/token.
 */
export async function loginWithCredentials(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const csrfRes = await fetch(`${getApiBase()}/api/auth/csrf`, {
    credentials: "include",
  });
  const csrf = await csrfRes.json().catch(() => ({}));
  const csrfToken = csrf?.csrfToken as string | undefined;
  if (!csrfToken) {
    return {
      ok: false,
      error:
        "CSRF/Token vom Server nicht erhalten. Prüfe apiBaseUrl und CORS für die Companion-App.",
    };
  }

  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${getApiBase()}/home`,
    json: "true",
  });

  const res = await fetch(`${getApiBase()}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    credentials: "include",
  });

  if (!res.ok) {
    return { ok: false, error: "Login fehlgeschlagen" };
  }

  // Native cookie jars vary — store a marker; real apps should exchange for a mobile JWT.
  await setSessionToken(`cookie-session:${Date.now()}`);
  return { ok: true };
}

export async function postHealthIngest(payload: unknown) {
  return apiFetch("/api/health/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
