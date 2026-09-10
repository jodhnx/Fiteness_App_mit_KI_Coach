/** localStorage persistence for offline-first Home / Progress / Nutrition. */

export const PERSISTENT_CACHE_KEYS = [
  "home-data",
  "progress-main",
  "nutrition-dashboard",
  "profile-data",
  "food-history",
] as const;

/** Shared with client-cache — never store account data without this owner. */
export const CACHE_OWNER_STORAGE_KEY = "nexform:cache-owner";

/**
 * Soft grace after hard TTL: keep stale entries for overnight / multi-day reopen
 * so Home paints instantly from last-known data while bootstrap refreshes.
 * Default: 7 days after expires.
 */
export const PERSISTENT_STALE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/** Daily snapshots — keyed by local calendar day so yesterday never paints as today. */
const DATED_LOGICAL_KEYS = new Set(["home-data", "nutrition-dashboard"]);

type StoredEntry = {
  data: unknown;
  expires: number;
  /** Absolute time after which entry is deleted (expires + grace). */
  staleUntil?: number;
};

const PREFIX = "nexform:cache:";

function localYmd(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function browserLocalStorage(): Storage | null {
  try {
    const w = (globalThis as { window?: { localStorage?: Storage } }).window;
    return w?.localStorage ?? null;
  } catch {
    return null;
  }
}

function readOwner(): string | null {
  const ls = browserLocalStorage();
  if (!ls) return null;
  try {
    return ls.getItem(CACHE_OWNER_STORAGE_KEY);
  } catch {
    return null;
  }
}

function logicalDiskKey(logical: string, ymd = localYmd()): string {
  return DATED_LOGICAL_KEYS.has(logical) ? `${logical}:${ymd}` : logical;
}

/** Public for tests: userId + resource (+ date for daily keys). */
export function persistentCacheStorageKey(
  logical: string,
  owner: string | null,
  ymd = localYmd()
): string {
  const dated = logicalDiskKey(logical, ymd);
  return owner ? `${PREFIX}${owner}:${dated}` : `${PREFIX}${dated}`;
}

function primaryStorageKey(logical: string): string | null {
  const owner = readOwner();
  if (!owner) return null;
  return persistentCacheStorageKey(logical, owner);
}

function legacyStorageKeys(logical: string): string[] {
  const owner = readOwner();
  const keys = [`${PREFIX}${logical}`];
  if (owner) keys.unshift(`${PREFIX}${owner}:${logical}`);
  return keys;
}

export function writePersistentCache(key: string, data: unknown, ttlMs: number) {
  const ls = browserLocalStorage();
  if (!ls) return;
  if (!PERSISTENT_CACHE_KEYS.includes(key as (typeof PERSISTENT_CACHE_KEYS)[number])) return;
  const storageKey = primaryStorageKey(key);
  if (!storageKey) return;
  try {
    const expires = Date.now() + ttlMs;
    const entry: StoredEntry = {
      data,
      expires,
      staleUntil: expires + PERSISTENT_STALE_GRACE_MS,
    };
    ls.setItem(storageKey, JSON.stringify(entry));
  } catch {
    /* quota exceeded — ignore */
  }
}

function parseEntry(raw: string | null): StoredEntry | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredEntry;
  } catch {
    return null;
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
  const ls = browserLocalStorage();
  if (!ls) return null;
  try {
    const primary = primaryStorageKey(key);
    const candidates = [
      primary,
      ...legacyStorageKeys(key),
    ].filter((k, i, arr): k is string => Boolean(k) && arr.indexOf(k) === i);

    let raw: string | null = null;
    let usedKey: string | null = null;
    for (const k of candidates) {
      raw = ls.getItem(k);
      if (raw) {
        usedKey = k;
        break;
      }
    }
    if (!raw || !usedKey) return null;

    const entry = parseEntry(raw);
    if (!entry) {
      ls.removeItem(usedKey);
      return null;
    }

    const now = Date.now();
    const staleUntil =
      entry.staleUntil ?? entry.expires + PERSISTENT_STALE_GRACE_MS;

    if (now > staleUntil) {
      ls.removeItem(usedKey);
      return null;
    }

    if (primary && usedKey !== primary) {
      try {
        ls.setItem(primary, raw);
        ls.removeItem(usedKey);
      } catch {
        /* ignore */
      }
    }

    if (now <= entry.expires) {
      return { ...entry, isStale: false };
    }

    if (opts?.allowStale !== false) {
      return { ...entry, isStale: true };
    }

    return null;
  } catch {
    return null;
  }
}

function removeLogical(logical: string) {
  const ls = browserLocalStorage();
  if (!ls) return;
  const primary = primaryStorageKey(logical);
  if (primary) ls.removeItem(primary);
  for (const k of legacyStorageKeys(logical)) {
    ls.removeItem(k);
  }
}

export function clearPersistentCache(key?: string) {
  const ls = browserLocalStorage();
  if (!ls) return;
  if (key) {
    removeLogical(key);
    return;
  }
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k?.startsWith(PREFIX)) toRemove.push(k);
    }
    for (const k of toRemove) ls.removeItem(k);
  } catch {
    for (const k of PERSISTENT_CACHE_KEYS) removeLogical(k);
  }
}

export function clearPersistentCacheByPrefix(prefix: string) {
  const ls = browserLocalStorage();
  if (!ls) return;
  for (const k of PERSISTENT_CACHE_KEYS) {
    if (k.startsWith(prefix)) removeLogical(k);
  }
}
