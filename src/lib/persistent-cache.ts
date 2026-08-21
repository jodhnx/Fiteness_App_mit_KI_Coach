/** localStorage persistence for offline-first Home / Progress / Nutrition. */

export const PERSISTENT_CACHE_KEYS = [
  "home-data",
  "progress-main",
  "nutrition-dashboard",
] as const;

/**
 * Soft grace after hard TTL: keep stale entries for overnight / multi-day reopen
 * so Home paints instantly from last-known data while bootstrap refreshes.
 * Default: 7 days after expires.
 */
export const PERSISTENT_STALE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

type StoredEntry = {
  data: unknown;
  expires: number;
  /** Absolute time after which entry is deleted (expires + grace). */
  staleUntil?: number;
};

const PREFIX = "nexform:cache:";

function storageKey(key: string) {
  return `${PREFIX}${key}`;
}

export function writePersistentCache(key: string, data: unknown, ttlMs: number) {
  if (typeof window === "undefined") return;
  if (!PERSISTENT_CACHE_KEYS.includes(key as (typeof PERSISTENT_CACHE_KEYS)[number])) return;
  try {
    const expires = Date.now() + ttlMs;
    const entry: StoredEntry = {
      data,
      expires,
      staleUntil: expires + PERSISTENT_STALE_GRACE_MS,
    };
    localStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    /* quota exceeded — ignore */
  }
}

/**
 * Read disk cache.
 * - Fresh: Date.now() <= expires
 * - Stale-usable: expires < now <= staleUntil (returned with expired=true)
 * - Dead: past staleUntil → deleted
 */
export function readPersistentCache(
  key: string,
  opts?: { allowStale?: boolean }
): (StoredEntry & { isStale: boolean }) | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const entry = JSON.parse(raw) as StoredEntry;
    const now = Date.now();
    const staleUntil =
      entry.staleUntil ?? entry.expires + PERSISTENT_STALE_GRACE_MS;

    if (now > staleUntil) {
      localStorage.removeItem(storageKey(key));
      return null;
    }

    if (now <= entry.expires) {
      return { ...entry, isStale: false };
    }

    // Past hard TTL but within grace
    if (opts?.allowStale !== false) {
      return { ...entry, isStale: true };
    }

    return null;
  } catch {
    return null;
  }
}

export function clearPersistentCache(key?: string) {
  if (typeof window === "undefined") return;
  if (!key) {
    for (const k of PERSISTENT_CACHE_KEYS) {
      localStorage.removeItem(storageKey(k));
    }
    return;
  }
  localStorage.removeItem(storageKey(key));
}

export function clearPersistentCacheByPrefix(prefix: string) {
  if (typeof window === "undefined") return;
  for (const k of PERSISTENT_CACHE_KEYS) {
    if (k.startsWith(prefix)) localStorage.removeItem(storageKey(k));
  }
}
