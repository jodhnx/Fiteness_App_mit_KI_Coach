"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCached,
  getCached,
  invalidateCache,
  isCacheStale,
  refreshCached,
} from "@/lib/client-cache";
import { fetchWithTimeout, FetchTimeoutError } from "@/lib/fetch-with-timeout";

const DEFAULT_TIMEOUT_MS = 8000;

export function useCachedFetch<T>(
  key: string,
  url: string,
  ttlMs = 60_000,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  options?: { revalidateOnMount?: boolean; staleRatio?: number }
) {
  const revalidateOnMount = options?.revalidateOnMount ?? false;
  const staleRatio = options?.staleRatio ?? 0.9;
  const [data, setData] = useState<T | null>(() =>
    getCached<T>(key, { allowStale: true })
  );
  const [loading, setLoading] = useState(
    () => getCached<T>(key, { allowStale: true }) === null
  );
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const mounted = useRef(true);

  const fetcher = useCallback(async (): Promise<T> => {
    const res = await fetchWithTimeout(
      url,
      { credentials: "same-origin" },
      timeoutMs
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof body === "object" && body && "error" in body
          ? String((body as { error: string }).error)
          : `Laden fehlgeschlagen (${res.status})`;
      throw new Error(msg);
    }
    if (
      typeof body === "object" &&
      body &&
      "error" in body &&
      !("calorieTarget" in body) &&
      !("caloriesIntake" in body) &&
      !("dashboard" in body) &&
      !("activities" in body) &&
      !("nutrition" in body) &&
      !("totalXP" in body) &&
      !("achievements" in body) &&
      !("summary" in body)
    ) {
      throw new Error(String((body as { error: string }).error));
    }
    return body as T;
  }, [url, timeoutMs]);

  const reload = useCallback(async () => {
    invalidateCache(key);
    setLoading(true);
    setError(null);
    setTimedOut(false);

    try {
      const json = await fetchCached(key, fetcher, ttlMs);
      if (mounted.current) setData(json);
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.error(`[useCachedFetch] ${key}`, e);
      }
      if (mounted.current) {
        if (e instanceof FetchTimeoutError) {
          setTimedOut(true);
          setError(e.message);
        } else {
          setError(e instanceof Error ? e.message : "Fehler beim Laden");
        }
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [key, fetcher, ttlMs]);

  useEffect(() => {
    mounted.current = true;
    const hit = getCached<T>(key);

    if (hit !== null) {
      setData(hit);
      setLoading(false);
      if (revalidateOnMount && isCacheStale(key, staleRatio)) {
        refreshCached(
          key,
          fetcher,
          ttlMs,
          (fresh) => {
            if (mounted.current) setData(fresh);
          },
          () => {
            /* keep stale data on background failure */
          }
        );
      }
      return () => {
        mounted.current = false;
      };
    }

    reload();
    return () => {
      mounted.current = false;
    };
  }, [key, reload, revalidateOnMount, staleRatio, fetcher, ttlMs]);

  return { data, loading, error, timedOut, reload };
}
