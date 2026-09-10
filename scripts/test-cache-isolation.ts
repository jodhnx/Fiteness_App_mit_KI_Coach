/**
 * Persistent cache isolation tests (userId + resource + date).
 * Run: npx tsx scripts/test-cache-isolation.ts
 */

import {
  persistentCacheStorageKey,
  CACHE_OWNER_STORAGE_KEY,
  writePersistentCache,
  readPersistentCache,
  clearPersistentCache,
} from "../src/lib/persistent-cache";

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
}

const mem = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => {
    mem.set(k, v);
  },
  removeItem: (k: string) => {
    mem.delete(k);
  },
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
};

(globalThis as unknown as { window: { localStorage: typeof localStorageMock } }).window =
  { localStorage: localStorageMock };
(globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage =
  localStorageMock;

console.log("Cache isolation tests\n");

{
  const a = persistentCacheStorageKey("home-data", "user-a", "2026-09-10");
  const b = persistentCacheStorageKey("home-data", "user-b", "2026-09-10");
  assert("owner in key", a.includes("user-a") && a.includes("home-data"));
  assert("accounts isolated", a !== b);
  assert(
    "daily home key",
    a.includes("2026-09-10") && persistentCacheStorageKey("profile-data", "user-a", "2026-09-10") ===
      "nexform:cache:user-a:profile-data"
  );
}

{
  mem.clear();
  localStorageMock.setItem(CACHE_OWNER_STORAGE_KEY, "user-a");
  writePersistentCache("nutrition-dashboard", { remaining: { calories: 1800 } }, 60_000);
  const hit = readPersistentCache("nutrition-dashboard");
  assert("write/read with owner", hit != null && (hit.data as { remaining: { calories: number } }).remaining.calories === 1800);

  mem.set(CACHE_OWNER_STORAGE_KEY, "user-b");
  const other = readPersistentCache("nutrition-dashboard");
  assert("other user misses A cache", other == null);
}

{
  mem.clear();
  localStorageMock.setItem(CACHE_OWNER_STORAGE_KEY, "user-a");
  writePersistentCache("home-data", { name: "A" }, 60_000);
  clearPersistentCache();
  assert("clear wipes account cache", readPersistentCache("home-data") == null);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
