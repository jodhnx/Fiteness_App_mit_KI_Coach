/** localStorage persistence for offline-first Home / Progress / Nutrition. */

export const PERSISTENT_CACHE_KEYS = [
  "home-data",
  "progress-main",
  "nutrition-dashboard",
] as const;

type StoredEntry = { data: unknown; expires: number };

const PREFIX = "nexform:cache:";

function storageKey(key: string) {
  return `${PREFIX}${key}`;
}

export function writePersistentCache(key: string, data: unknown, ttlMs: number) {
  if (typeof window === "undefined") return;
  if (!PERSISTENT_CACHE_KEYS.includes(key as (typeof PERSISTENT_CACHE_KEYS)[number])) return;
  try {
    const entry: StoredEntry = { data, expires: Date.now() + ttlMs };
    localStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function readPersistentCache(key: string): StoredEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const entry = JSON.parse(raw) as StoredEntry;
    if (Date.now() > entry.expires) {
      localStorage.removeItem(storageKey(key));
      return null;
    }
    return entry;
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
