/** Session-scoped boot splash flag — safe for client-only callers. */

export const BOOT_SPLASH_KEY = "nexform:boot-done";

export function hasBootSplashCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(BOOT_SPLASH_KEY) === "1";
  } catch {
    return false;
  }
}

export function markBootSplashCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(BOOT_SPLASH_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearBootSplashFlag(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(BOOT_SPLASH_KEY);
  } catch {
    /* ignore */
  }
}
