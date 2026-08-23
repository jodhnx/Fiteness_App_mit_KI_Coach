import {
  writePersistentCache,
  readPersistentCache,
  clearPersistentCache,
  clearPersistentCacheByPrefix,
} from "@/lib/persistent-cache";

type CacheEntry<T> = { data: T; expires: number; cachedAt: number };

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const OWNER_KEY = "nexform:cache-owner";

export function getCacheOwner(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

export function setCacheOwner(userId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OWNER_KEY, userId);
  } catch {
    /* ignore */
  }
}

export function clearCacheOwner() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(OWNER_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Bind caches to the authenticated user. If another user owns the cache,
 * wipe everything first so no A→B leak occurs.
 * Returns true if caches were cleared due to owner mismatch.
 */
export function bindCacheOwner(userId: string): boolean {
  const prev = getCacheOwner();
  if (prev && prev !== userId) {
    store.clear();
    inflight.clear();
    clearPersistentCache();
    setCacheOwner(userId);
    return true;
  }
  if (!prev) setCacheOwner(userId);
  return false;
}

export function getCached<T>(key: string, opts?: { allowStale?: boolean }): T | null {
  const entry = store.get(key);
  if (entry) {
    if (Date.now() <= entry.expires) return entry.data as T;
    if (opts?.allowStale) return entry.data as T;
    store.delete(key);
  }

  // Memory miss — try persistent disk cache (account-bound via hydrate/owner)
  if (typeof window !== "undefined") {
    try {
      const hit = readPersistentCache(key, { allowStale: opts?.allowStale !== false });
      if (hit) {
        const remaining = hit.expires - Date.now();
        if (remaining > 0) {
          store.set(key, {
            data: hit.data,
            cachedAt: hit.expires - remaining,
            expires: hit.expires,
          });
          return hit.data as T;
        }
        // Soft-stale: keep in memory briefly so boot can reuse without re-read
        if (opts?.allowStale !== false) {
          store.set(key, {
            data: hit.data,
            cachedAt: hit.expires - 60_000,
            expires: Date.now() + 60_000,
          });
          return hit.data as T;
        }
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

export function getCacheAgeMs(key: string): number | null {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.expires) return null;
  return Date.now() - entry.cachedAt;
}

/** True when cache is missing, expired, or past stale threshold (default 75% of TTL). */
export function isCacheStale(key: string, staleRatio = 0.75): boolean {
  const entry = store.get(key);
  if (!entry) return true;
  if (Date.now() > entry.expires) return true;
  const ttl = entry.expires - entry.cachedAt;
  if (ttl <= 0) return true;
  const age = Date.now() - entry.cachedAt;
  return age / ttl >= staleRatio;
}

export function setCached<T>(key: string, data: T, ttlMs = 60_000) {
  const now = Date.now();
  store.set(key, { data, cachedAt: now, expires: now + ttlMs });
  writePersistentCache(key, data, ttlMs);
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    store.clear();
    inflight.clear();
    clearPersistentCache();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      inflight.delete(key);
    }
  }
  clearPersistentCacheByPrefix(prefix);
}

async function runDeduped<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number
): Promise<T> {
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = fetcher()
    .then((data) => {
      setCached(key, data, ttlMs);
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/** Fetch with TTL cache + in-flight deduplication. */
export async function fetchCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 60_000
): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== null) return hit;
  return runDeduped(key, fetcher, ttlMs);
}

/** Background refresh — always hits network (deduped). */
export function refreshCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 60_000,
  onDone?: (data: T) => void,
  onError?: (e: unknown) => void
): void {
  if (inflight.has(key)) {
    inflight
      .get(key)!
      .then((d) => onDone?.(d as T))
      .catch(onError);
    return;
  }
  runDeduped(key, fetcher, ttlMs).then(onDone).catch(onError);
}

/**
 * Restore Home / Progress / Nutrition from localStorage on cold start.
 * Only hydrates when cache owner matches the current user (or owner unknown
 * and caller will bind immediately after).
 */
export function hydratePersistentCaches(expectedUserId?: string | null) {
  if (typeof window === "undefined") return;
  if (expectedUserId) {
    const owner = getCacheOwner();
    if (owner && owner !== expectedUserId) {
      clearPersistentCache();
      store.clear();
      setCacheOwner(expectedUserId);
      return;
    }
    if (!owner) setCacheOwner(expectedUserId);
  } else {
    // Without a known user, never hydrate account data from disk
    return;
  }

  const keys = ["home-data", "progress-main", "nutrition-dashboard", "profile-data"] as const;
  for (const key of keys) {
    if (store.has(key)) continue;
    // Allow soft-stale disk entries so overnight reopen stays instant
    const hit = readPersistentCache(key, { allowStale: true });
    if (hit) {
      const ttlMs = Math.max(60_000, hit.expires - Date.now());
      store.set(key, {
        data: hit.data,
        cachedAt: Date.now() - (hit.isStale ? 120_000 : 0),
        expires: Date.now() + ttlMs,
      });
    }
  }
}
