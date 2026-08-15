/**
 * Wipe all client-side user data so account switches never leak A→B.
 * Call before logout redirect and before seeding a new login session.
 */

import { invalidateCache, clearCacheOwner } from "@/lib/client-cache";
import { clearCachedCoachChat } from "@/lib/coach-chat-cache";
import { clearPhoneSensorConsent, clearGpsSession } from "@/lib/phone-sensors";
import { PENDING_LIVE_SESSION_KEY } from "@/lib/workout-cache-sync";
import { resetNavCacheWarmer } from "@/lib/nav-cache-warmer";
import { clearExercisePickerListsCache } from "@/lib/exercise-picker-cache";
import { clearExerciseSearchCache } from "@/lib/exercise-search-cache";

const LOCAL_KEYS = [
  "nexform:shopping-list-v1",
  "nexform:meal-reminders",
  "nexform:notif-push",
  "nexform:notif-training",
  "nexform:notif-nutrition",
  "nexform:notif-progress",
  "nexform:phone-sensors-consent",
  "nexform:phone-steps-today",
  "nexform:gps-session",
  "nexform-coach-chat",
  "nexform:guest-credentials",
  "nexform:cache-owner",
  "nexform:cache:recipe-catalog-favorites",
] as const;

const SESSION_KEYS = [
  PENDING_LIVE_SESSION_KEY,
  "nexform:tab-visited:home",
  "erfolge-unlocked-count",
  "gamification-unlock-queue",
] as const;

function safeRemoveLocal(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function safeRemoveSession(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Clear memory caches, persistent caches, and user-scoped local/session keys. */
export function clearAllUserClientState(): void {
  if (typeof window === "undefined") return;

  invalidateCache();
  invalidateCache("recipe-catalog");
  clearCacheOwner();
  clearCachedCoachChat();
  clearExercisePickerListsCache();
  clearExerciseSearchCache();
  resetNavCacheWarmer();

  try {
    clearPhoneSensorConsent();
    clearGpsSession();
  } catch {
    /* ignore */
  }

  for (const key of LOCAL_KEYS) safeRemoveLocal(key);

  // Sweep any leftover nexform:cache:* entries
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith("nexform:cache:") ||
        k.startsWith("nexform:loaded:") ||
        k === "nexform:guest-credentials" ||
        k.startsWith("erfolge-level:")
      ) {
        toRemove.push(k);
      }
    }
    for (const k of toRemove) safeRemoveLocal(k);
  } catch {
    /* ignore */
  }

  for (const key of SESSION_KEYS) safeRemoveSession(key);

  try {
    const sessionRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k) continue;
      if (k.startsWith("erfolge-") || k.startsWith("nexform:tab-visited:")) {
        sessionRemove.push(k);
      }
    }
    for (const k of sessionRemove) safeRemoveSession(k);
  } catch {
    /* ignore */
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nexform:user-state-cleared"));
  }
}
