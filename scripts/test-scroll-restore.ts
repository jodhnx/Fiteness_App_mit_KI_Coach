/**
 * Scroll restore keying + save/peek/clear + nav semantics.
 * Run: npx tsx scripts/test-scroll-restore.ts
 */
import {
  buildScrollKey,
  buildScrollKeyNormalized,
  clearAllScrollPositions,
  clearScrollPosition,
  normalizeSearch,
  peekScrollPosition,
  restoreScrollPosition,
  saveScrollPosition,
  __scrollTestHelpers,
} from "../src/lib/scroll-restore";

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

console.log("Scroll Restore Tests\n");

assert("null path → null key", buildScrollKey(null) === null);
assert("path only", buildScrollKey("/settings") === "/settings");
assert(
  "path + search",
  buildScrollKey("/settings", "?view=notifications") ===
    "/settings?view=notifications"
);
assert(
  "search without ?",
  buildScrollKey("/settings", "view=konto") === "/settings?view=konto"
);
assert(
  "tabs keyed separately",
  buildScrollKey("/home") !== buildScrollKey("/nutrition")
);
assert(
  "trailing slash normalized",
  buildScrollKey("/settings/") === "/settings"
);
assert(
  "similar paths differ",
  buildScrollKey("/settings") !== buildScrollKey("/settings/support")
);
assert(
  "query order normalized",
  buildScrollKeyNormalized("/settings", "?b=2&a=1") ===
    buildScrollKeyNormalized("/settings", "?a=1&b=2")
);
assert(
  "normalizeSearch sorts",
  normalizeSearch("?z=1&a=2") === "?a=2&z=1"
);

const helpers = __scrollTestHelpers();
helpers.clearMemory();
clearAllScrollPositions();

assert("peek missing → null", peekScrollPosition("/settings") === null);
clearScrollPosition("/settings");
assert("clear is noop-safe", peekScrollPosition("/settings") === null);

// Simulate memory (no window in Node) via helpers
helpers.setMemory("/settings", 420);
assert("peek after setMemory", peekScrollPosition("/settings") === 420);
helpers.setMemory("/settings?view=notifications", 0);
assert(
  "settings vs notifications keys isolated",
  peekScrollPosition("/settings") === 420 &&
    peekScrollPosition("/settings?view=notifications") === 0
);
helpers.setMemory("/more", 880);
helpers.setMemory("/rezepte", 200);
helpers.setMemory("/rezepte/protein-pancakes", 0);
assert(
  "recipe list vs detail isolated",
  peekScrollPosition("/rezepte") === 200 &&
    peekScrollPosition("/rezepte/protein-pancakes") === 0
);
helpers.setMemory("/nutrition", 150);
assert("nutrition calendar parent key", peekScrollPosition("/nutrition") === 150);

// restore without window is no-op false
assert(
  "restore without window returns false",
  restoreScrollPosition("/settings") === false
);

saveScrollPosition("/settings");
assert("save without window does not throw", true);

helpers.clearMemory();
clearAllScrollPositions();
assert("clearAll empties memory", helpers.memorySize() === 0);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
