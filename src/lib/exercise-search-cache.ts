const TTL_MS = 120_000;
const store = new Map<string, { data: unknown; expires: number }>();

export function exerciseCacheKey(params: URLSearchParams, userId?: string): string {
  const base = params.toString();
  return userId ? `${userId}:${base}` : base;
}

export function getExerciseCache<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return null;
  }
  return hit.data as T;
}

export function setExerciseCache(key: string, data: unknown) {
  store.set(key, { data, expires: Date.now() + TTL_MS });
}

export function clearExerciseSearchCache() {
  store.clear();
}
