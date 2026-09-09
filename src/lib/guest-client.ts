"use client";

import { signIn } from "next-auth/react";
import type { OnboardingDraft } from "@/lib/onboarding-draft";
import { storageSetJson, storageRemove } from "@/lib/storage-service";
import { warmTrainingCaches } from "@/lib/cache-manager";
import { clearAllUserClientState } from "@/lib/clear-user-client-state";

export const GUEST_CREDS_KEY = "guest-credentials";

export async function startGuestSession(
  onboarding?: OnboardingDraft | null
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/auth/guest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ onboarding: onboarding ?? undefined }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.error === "string" && data.error.trim()
        ? data.error
        : "Gastmodus fehlgeschlagen";
    return { ok: false, error: msg };
  }

  // Wipe previous account caches before switching into guest session
  clearAllUserClientState();

  storageSetJson(GUEST_CREDS_KEY, { email: data.email, password: data.password });

  const login = await signIn("credentials", {
    email: data.email,
    password: data.password,
    redirect: false,
  });

  if (login?.error) {
    return { ok: false, error: "Gast-Anmeldung fehlgeschlagen. Bitte erneut versuchen." };
  }

  warmTrainingCaches(true);
  return { ok: true };
}

export function clearGuestCredentials() {
  storageRemove(GUEST_CREDS_KEY);
}
