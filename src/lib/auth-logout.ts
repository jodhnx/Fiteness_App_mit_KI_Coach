"use client";

import { signOut } from "next-auth/react";
import { clearAllUserClientState } from "@/lib/clear-user-client-state";

/**
 * Clear all client user state, then sign out.
 * Uses redirect:false + hard navigation so NextAuth cannot rewrite /login → /home.
 */
export async function logoutAndClear(callbackUrl = "/login") {
  clearAllUserClientState();
  try {
    await signOut({ redirect: false });
  } catch {
    /* session may already be gone */
  }
  const target =
    callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/login";
  // Hard navigation avoids soft-nav leftover shell/providers from previous account.
  window.location.replace(target);
}
