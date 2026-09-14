/**
 * Central scroll position save/restore for App Router + keep-alive tabs.
 * Keys are route-scoped (pathname + search). Supports window + nested
 * containers marked with [data-scroll-restore].
 */

const MEMORY = new Map<string, number>();
const NESTED_MEMORY = new Map<string, Record<string, number>>();
const SESSION_PREFIX = "nexform:scroll:";
const SESSION_NESTED_PREFIX = "nexform:scroll-nested:";
const MAX_SESSION_KEYS = 80;

export type ScrollRestoreKey = string;
export type ScrollNavKind = "push" | "pop" | "replace";

/** Normalize path+search into a stable key (hash ignored for storage). */
export function buildScrollKey(
  pathname: string | null | undefined,
  search = ""
): ScrollRestoreKey | null {
  if (!pathname) return null;
  const q = search.startsWith("?") ? search : search ? `?${search}` : "";
  // Drop trailing slash (except root) so /settings and /settings/ don't diverge
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return `${path}${q}`;
}

/** Normalize search params order for stable keys. */
export function normalizeSearch(search: string): string {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  if (!raw) return "";
  const params = new URLSearchParams(raw);
  const keys = [...new Set([...params.keys()])].sort();
  const next = new URLSearchParams();
  for (const k of keys) {
    for (const v of params.getAll(k)) next.append(k, v);
  }
  const s = next.toString();
  return s ? `?${s}` : "";
}

export function buildScrollKeyNormalized(
  pathname: string | null | undefined,
  search = ""
): ScrollRestoreKey | null {
  return buildScrollKey(pathname, normalizeSearch(search));
}

export function readWindowScrollY(): number {
  if (typeof window === "undefined") return 0;
  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

export function applyWindowScrollY(y: number): void {
  if (typeof window === "undefined") return;
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  window.scrollTo(0, Math.max(0, y));
  document.documentElement.scrollTop = Math.max(0, y);
  document.body.scrollTop = Math.max(0, y);
  html.style.scrollBehavior = prev;
}

function nestedContainers(): HTMLElement[] {
  if (typeof document === "undefined") return [];
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-scroll-restore]")
  );
}

function readNestedScrolls(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const el of nestedContainers()) {
    const id = el.getAttribute("data-scroll-restore");
    if (!id) continue;
    out[id] = el.scrollTop;
  }
  return out;
}

function applyNestedScrolls(map: Record<string, number> | null | undefined) {
  if (!map) return;
  for (const el of nestedContainers()) {
    const id = el.getAttribute("data-scroll-restore");
    if (!id || map[id] == null) continue;
    el.scrollTop = Math.max(0, map[id]);
  }
}

export function saveScrollPosition(
  key: ScrollRestoreKey | null,
  explicitY?: number
): void {
  if (!key || typeof window === "undefined") return;
  const y = explicitY != null ? explicitY : readWindowScrollY();
  MEMORY.set(key, y);
  const nested = readNestedScrolls();
  if (Object.keys(nested).length) {
    NESTED_MEMORY.set(key, nested);
  }
  try {
    sessionStorage.setItem(`${SESSION_PREFIX}${key}`, String(Math.round(y)));
    if (Object.keys(nested).length) {
      sessionStorage.setItem(
        `${SESSION_NESTED_PREFIX}${key}`,
        JSON.stringify(nested)
      );
    }
    pruneSessionScrollKeys();
  } catch {
    /* quota / private mode */
  }
}

export function peekScrollPosition(key: ScrollRestoreKey | null): number | null {
  if (!key) return null;
  if (MEMORY.has(key)) return MEMORY.get(key)!;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_PREFIX}${key}`);
    if (raw == null) return null;
    const y = Number(raw);
    if (!Number.isFinite(y) || y < 0) return null;
    MEMORY.set(key, y);
    return y;
  } catch {
    return null;
  }
}

function peekNested(key: ScrollRestoreKey): Record<string, number> | null {
  if (NESTED_MEMORY.has(key)) return NESTED_MEMORY.get(key)!;
  try {
    const raw = sessionStorage.getItem(`${SESSION_NESTED_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (!parsed || typeof parsed !== "object") return null;
    NESTED_MEMORY.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function clearScrollPosition(key: ScrollRestoreKey | null): void {
  if (!key) return;
  MEMORY.delete(key);
  NESTED_MEMORY.delete(key);
  try {
    sessionStorage.removeItem(`${SESSION_PREFIX}${key}`);
    sessionStorage.removeItem(`${SESSION_NESTED_PREFIX}${key}`);
  } catch {
    /* ignore */
  }
}

export function clearAllScrollPositions(): void {
  MEMORY.clear();
  NESTED_MEMORY.clear();
  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (
        k?.startsWith(SESSION_PREFIX) ||
        k?.startsWith(SESSION_NESTED_PREFIX)
      ) {
        toRemove.push(k);
      }
    }
    for (const k of toRemove) sessionStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

function pruneSessionScrollKeys(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(SESSION_PREFIX)) keys.push(k);
    }
    if (keys.length <= MAX_SESSION_KEYS) return;
    for (const k of keys.slice(0, keys.length - MAX_SESSION_KEYS)) {
      sessionStorage.removeItem(k);
      const routeKey = k.slice(SESSION_PREFIX.length);
      MEMORY.delete(routeKey);
      sessionStorage.removeItem(`${SESSION_NESTED_PREFIX}${routeKey}`);
      NESTED_MEMORY.delete(routeKey);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Restore before paint. Returns true when a stored position was applied.
 * Hash targets (#section) win over stored Y when present.
 *
 * navKind:
 * - pop/forward with stored Y → restore
 * - push with no stored Y → top (intentional new entry)
 * - pop with no stored Y → leave scroll alone (avoid false 0 flash)
 */
export function restoreScrollPosition(
  key: ScrollRestoreKey | null,
  opts?: { hash?: string; navKind?: ScrollNavKind }
): boolean {
  if (typeof window === "undefined") return false;

  const hash = opts?.hash?.replace(/^#/, "") || "";
  if (hash) {
    const el = document.getElementById(hash);
    if (el) {
      const prev = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      el.scrollIntoView({ block: "start" });
      document.documentElement.style.scrollBehavior = prev;
      return true;
    }
  }

  const y = peekScrollPosition(key);
  if (y != null) {
    applyWindowScrollY(y);
    if (key) applyNestedScrolls(peekNested(key));
    // Re-apply after layout (images/sheets) without visible jump
    requestAnimationFrame(() => {
      applyWindowScrollY(y);
      if (key) applyNestedScrolls(peekNested(key));
    });
    return true;
  }

  const kind = opts?.navKind ?? "push";
  if (kind === "push" || kind === "replace") {
    applyWindowScrollY(0);
  }
  return false;
}

/** Pure helpers for tests — memory map size / key collisions. */
export function __scrollTestHelpers() {
  return {
    memorySize: () => MEMORY.size,
    setMemory: (key: string, y: number) => MEMORY.set(key, y),
    clearMemory: () => {
      MEMORY.clear();
      NESTED_MEMORY.clear();
    },
  };
}
