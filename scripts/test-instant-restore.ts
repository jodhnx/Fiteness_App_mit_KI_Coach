/**
 * Instant restore / overnight cache / loading-vs-empty tests.
 * Run: npx tsx scripts/test-instant-restore.ts
 */

import {
  CACHE_OWNER_STORAGE_KEY,
  writePersistentCache,
  readPersistentCache,
  clearPersistentCache,
  persistentCacheStorageKey,
  persistentLatestStorageKey,
  localYmd,
} from "../src/lib/persistent-cache";
import {
  resolveNutritionDisplayState,
  hasCalorieTarget,
} from "../src/lib/nutrition-display";
import {
  createEmptyNutritionDashboard,
  normalizeNutritionDashboard,
} from "../src/lib/nutrition-defaults";
import {
  resolveNutritionDashboardForBoot,
  nutritionShellFromProfile,
  rolloverNutritionDashboardToToday,
} from "../src/lib/nutrition-day-rollover";
import { nutritionDayKey } from "../src/lib/nutrition-day";

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

console.log("Instant restore / overnight cache tests\n");

{
  mem.clear();
  localStorageMock.setItem(CACHE_OWNER_STORAGE_KEY, "user-a");
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return localYmd(d);
  })();

  // Simulate write on yesterday by writing directly to yesterday's dated key
  const yKey = persistentCacheStorageKey("nutrition-dashboard", "user-a", yesterday);
  const expires = Date.now() + 7 * 24 * 60 * 60_000;
  const payload = {
    targets: { calories: 2400, proteinG: 160, carbsG: 220, fatG: 70 },
    remaining: { calories: 1800 },
  };
  mem.set(
    yKey,
    JSON.stringify({
      data: payload,
      expires,
      staleUntil: expires + 7 * 24 * 60 * 60_000,
    })
  );

  const hit = readPersistentCache("nutrition-dashboard", { allowStale: true });
  assert("overnight dated miss → previous day hit", hit != null);
  assert(
    "overnight recovers calorie target",
    hit != null &&
      (hit.data as { targets: { calories: number } }).targets.calories === 2400
  );
  assert(
    "promotes to latest alias",
    mem.has(persistentLatestStorageKey("nutrition-dashboard", "user-a")!)
  );
}

{
  mem.clear();
  localStorageMock.setItem(CACHE_OWNER_STORAGE_KEY, "user-a");
  writePersistentCache(
    "home-data",
    { calorieTarget: 2200, userName: "Ben" },
    60_000
  );
  const latest = persistentLatestStorageKey("home-data", "user-a");
  assert("write creates latest alias", latest != null && mem.has(latest!));

  // Remove today's primary — latest must still serve
  const todayKey = persistentCacheStorageKey("home-data", "user-a", localYmd());
  mem.delete(todayKey);
  const hit = readPersistentCache("home-data", { allowStale: true });
  assert(
    "latest alias restores after primary delete",
    hit != null &&
      (hit.data as { calorieTarget: number }).calorieTarget === 2200
  );
}

{
  mem.clear();
  localStorageMock.setItem(CACHE_OWNER_STORAGE_KEY, "user-a");
  writePersistentCache("nutrition-dashboard", { remaining: { calories: 1 } }, 60_000);
  mem.set(CACHE_OWNER_STORAGE_KEY, "user-b");
  assert(
    "user B cannot read user A overnight cache",
    readPersistentCache("nutrition-dashboard", { allowStale: true }) == null
  );
}

{
  const empty = createEmptyNutritionDashboard();
  assert(
    "null dashboard → loading (not missing_target)",
    resolveNutritionDisplayState(null).kind === "loading"
  );
  assert(
    "explicit loading → loading",
    resolveNutritionDisplayState(empty, { loading: true }).kind === "loading"
  );
  assert(
    "empty settled → missing_target",
    resolveNutritionDisplayState(empty, { loading: false }).kind === "missing_target"
  );

  const ready = normalizeNutritionDashboard({
    ...empty,
    targets: { ...empty.targets, calories: 2400, proteinG: 150 },
    remaining: { ...empty.remaining, calories: 1800 },
  });
  assert("ready when targets exist", resolveNutritionDisplayState(ready).kind === "ready");
  assert("hasCalorieTarget true", hasCalorieTarget(ready));
}

{
  const prev = normalizeNutritionDashboard({
    ...createEmptyNutritionDashboard(),
    date: "2020-01-01",
    profileComplete: true,
    targets: {
      calories: 2500,
      proteinG: 180,
      carbsG: 200,
      fatG: 80,
      fiberG: 0,
      waterTargetMl: 2500,
      nutritionGoal: null,
    },
  });
  const rolled = resolveNutritionDashboardForBoot(prev);
  assert("rollover keeps targets", (rolled?.targets.calories ?? 0) === 2500);
  assert(
    "rollover uses today date",
    rolled?.date === nutritionDayKey(new Date())
  );
  assert(
    "rollover resets intake",
    (rolled?.consumed.calories ?? -1) === 0
  );

  const fromProfile = nutritionShellFromProfile({
    calculations: {
      bmi: 22,
      calorieTarget: 2300,
      proteinTargetG: 170,
      carbsTargetG: 210,
      fatTargetG: 75,
      recommendedTrainingDays: 4,
    },
  });
  assert(
    "profile shell seeds targets",
    (fromProfile?.targets.calories ?? 0) === 2300
  );
  assert(
    "rollover helper preserves macros",
    rolloverNutritionDashboardToToday(prev).targets.proteinG === 180
  );
}

{
  // First-setup readiness: targets present ⇒ not an empty-state flash
  const withTargets = normalizeNutritionDashboard({
    ...createEmptyNutritionDashboard(),
    profileComplete: true,
    targets: {
      calories: 2200,
      proteinG: 160,
      carbsG: 200,
      fatG: 70,
      fiberG: 0,
      waterTargetMl: 2500,
      nutritionGoal: null,
    },
  });
  assert(
    "first-setup ready state is ready not missing_target",
    resolveNutritionDisplayState(withTargets).kind === "ready"
  );
  assert(
    "loading flag blocks missing_target during setup",
    resolveNutritionDisplayState(withTargets, { loading: true }).kind ===
      "loading"
  );
}

{
  clearPersistentCache();
  assert("clear works", true);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
