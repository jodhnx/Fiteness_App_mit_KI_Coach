type CacheEntry<T> = { data: T; expires: number; cachedAt: number };

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
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
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    store.clear();
    inflight.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      inflight.delete(key);
    }
  }
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
    inflight.get(key)!
      .then((d) => onDone?.(d as T))
      .catch(onError);
    return;
  }
  runDeduped(key, fetcher, ttlMs).then(onDone).catch(onError);
}
