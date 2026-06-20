const PREFIX = "nexform:";

export function storageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    /* quota */
  }
}

export function storageGetJson<T>(key: string): T | null {
  const raw = storageGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function storageSetJson(key: string, value: unknown) {
  storageSet(key, JSON.stringify(value));
}

export function markScreenLoaded(screenId: string) {
  storageSet(`loaded:${screenId}`, "1");
}

export function hasScreenLoaded(screenId: string): boolean {
  return storageGet(`loaded:${screenId}`) === "1";
}

export function storageRemove(key: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
