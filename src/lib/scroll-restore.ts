/**
 * Central scroll restore — route-keyed, window scroll (AppShell uses document scroll).
 * Keep-alive tabs + nested routes share this module so positions never cross-contaminate.
 */

const memory = new Map<string, number>();
const STORAGE_PREFIX = "nexform:scroll:";

function storageKey(routeKey: string): string {
  return `${STORAGE_PREFIX}${routeKey}`;
}

/** Stable key for pathname + optional search (settings ?view=…). */
export function scrollRouteKey(
  pathname: string | null | undefined,
  search?: string | null
): string | null {
  if (!pathname) return null;
  const q = (search ?? "").replace(/^\?/, "");
  // Drop volatile noise that shouldn't reset scroll identity
  const clean = q
    .split("&")
    .filter((p) => {
      const k = p.split("=")[0];
      return k && k !== "photo" && k !== "quick" && k !== "_";
    })
    .sort()
    .join("&");
  return clean ? `${pathname}?${clean}` : pathname;
}

export function saveScrollPosition(routeKey: string, y: number): void {
  if (!routeKey) return;
  const value = Math.max(0, Math.round(y));
  memory.set(routeKey, value);
  if (typeof sessionStorage === "undefined") return;
  try {
    if (value <= 0) {
      sessionStorage.removeItem(storageKey(routeKey));
    } else {
      sessionStorage.setItem(storageKey(routeKey), String(value));
    }
  } catch {
    /* ignore quota */
  }
}

export function readScrollPosition(routeKey: string): number {
  if (!routeKey) return 0;
  const mem = memory.get(routeKey);
  if (typeof mem === "number") return mem;
  if (typeof sessionStorage === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(storageKey(routeKey));
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function getWindowScrollY(): number {
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
  const target = Math.max(0, Math.round(y));
  window.scrollTo(0, target);
  document.documentElement.scrollTop = target;
  document.body.scrollTop = target;
}

/**
 * Restore after paint — double rAF avoids layout fighting Next.js scroll.
 * Returns cleanup to cancel pending frames.
 */
export function restoreScrollPosition(
  routeKey: string,
  opts?: { instant?: boolean }
): () => void {
  const y = readScrollPosition(routeKey);
  if (y <= 0) {
    if (opts?.instant) applyWindowScrollY(0);
    return () => {};
  }
  let raf1 = 0;
  let raf2 = 0;
  let cancelled = false;
  const run = () => {
    if (cancelled) return;
    applyWindowScrollY(y);
  };
  if (opts?.instant) {
    run();
    return () => {
      cancelled = true;
    };
  }
  raf1 = requestAnimationFrame(() => {
    run();
    raf2 = requestAnimationFrame(run);
  });
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf1);
    cancelAnimationFrame(raf2);
  };
}

/** Clear all scroll memory (logout / account switch). */
export function clearScrollRestoreState(): void {
  memory.clear();
  if (typeof sessionStorage === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    for (const k of keys) sessionStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
