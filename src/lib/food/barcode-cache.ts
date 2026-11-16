/**
 * Short-lived server-side barcode → product cache.
 * Avoids repeating Open Food Facts calls for the same EAN within TTL.
 */

import type { FoodProduct } from "@/lib/food/food-product-types";

type CacheEntry = {
  expires: number;
  product: FoodProduct | null;
  error?: string;
};

const TTL_HIT_MS = 30 * 60_000;
const TTL_MISS_MS = 5 * 60_000;
const MAX_ENTRIES = 500;

const cache = new Map<string, CacheEntry>();

function prune() {
  if (cache.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of cache) {
    if (v.expires < now) cache.delete(k);
  }
  if (cache.size <= MAX_ENTRIES) return;
  const overflow = cache.size - MAX_ENTRIES;
  let i = 0;
  for (const k of cache.keys()) {
    cache.delete(k);
    if (++i >= overflow) break;
  }
}

export function getCachedBarcodeLookup(code: string): CacheEntry | null {
  const key = code.replace(/\D/g, "");
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit;
}

export function setCachedBarcodeLookup(
  code: string,
  product: FoodProduct | null,
  error?: string
) {
  const key = code.replace(/\D/g, "");
  cache.set(key, {
    product,
    error,
    expires: Date.now() + (product ? TTL_HIT_MS : TTL_MISS_MS),
  });
  prune();
}
