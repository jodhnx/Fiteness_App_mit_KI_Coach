import { fetchCached } from "@/lib/client-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import { PROFILE_CACHE_KEY } from "@/lib/nutrition-sync";

let warmed = false;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Warm ${url} failed`);
  return res.json() as Promise<T>;
}

/** Background prefetch for instant tab switches (no duplicate work). */
export function warmNavDataCaches() {
  if (warmed || typeof window === "undefined") return;
  warmed = true;

  const idle =
    typeof requestIdleCallback !== "undefined"
      ? requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 80);

  idle(() => {
    void fetchCached(
      PROGRESS_CACHE_KEY,
      () => fetchJson("/api/progress"),
      120_000
    ).catch(() => {});

    void fetchCached(
      PROFILE_CACHE_KEY,
      () => fetchJson("/api/profile"),
      120_000
    ).catch(() => {});
  });
}
