/**
 * Inflight request dedup (same pattern as /api/bootstrap shared promise).
 * Run: npx tsx scripts/test-bootstrap-dedup.ts
 */
import { bindCacheOwner, invalidateCache, fetchCached } from "../src/lib/client-cache";

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

async function main() {
  console.log("Bootstrap / fetch dedup tests\n");

  bindCacheOwner("dedup-user-a");
  invalidateCache();

  {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 40));
      return { ok: true, n: calls };
    };

    const [a, b, c] = await Promise.all([
      fetchCached("boot-dedup-key", fetcher, 60_000),
      fetchCached("boot-dedup-key", fetcher, 60_000),
      fetchCached("boot-dedup-key", fetcher, 60_000),
    ]);

    assert("parallel fetches share one network call", calls === 1);
    assert("all callers get same payload", a.n === 1 && b.n === 1 && c.n === 1);

    const d = await fetchCached("boot-dedup-key", fetcher, 60_000);
    assert("cache hit skips second network call", calls === 1 && d.n === 1);
  }

  {
    invalidateCache();
    bindCacheOwner("dedup-user-b");
    let calls = 0;
    await fetchCached(
      "boot-dedup-key",
      async () => {
        calls += 1;
        return { owner: "b" };
      },
      60_000
    );
    assert("user B uses isolated cache key", calls === 1);
  }

  invalidateCache();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
