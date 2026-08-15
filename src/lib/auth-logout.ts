"use client";

import { signOut } from "next-auth/react";
import { clearAllUserClientState } from "@/lib/clear-user-client-state";

/** Clear all client user state, then sign out — prevents A→B data flash. */
export async function logoutAndClear(callbackUrl = "/login") {
  clearAllUserClientState();
  await signOut({ callbackUrl, redirect: true });
}
