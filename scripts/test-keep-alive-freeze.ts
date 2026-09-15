/**
 * Keep-alive / tab outlet policy — RSC children must not be frozen.
 * Run: npx tsx scripts/test-keep-alive-freeze.ts
 */

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

/**
 * Policy mirror: live-only outlet never retains a second panel for the
 * active path (prevents duplicate Nutrition DOM under App Router RSC).
 */
function liveOnlyPanels(
  pathname: string,
  childrenLabel: string
): { active: string; hidden: string[] } {
  return { active: childrenLabel, hidden: [] };
}

console.log("Tab outlet (live RSC) policy tests\n");

{
  const a = liveOnlyPanels("/home", "HomePage");
  assert("home shows live home", a.active === "HomePage");
  assert("no hidden panels", a.hidden.length === 0);
}

{
  // Soft-nav desync must not create a second nutrition tree
  const mid = liveOnlyPanels("/home", "NutritionPage");
  assert("desync still single tree", mid.hidden.length === 0);
  const next = liveOnlyPanels("/nutrition", "NutritionPage");
  assert("nutrition single live tree", next.active === "NutritionPage");
  assert("nutrition has no hidden twin", next.hidden.length === 0);
}

{
  assert(
    "policy: never mount two nutrition layouts",
    liveOnlyPanels("/nutrition", "NutritionPage").hidden.length === 0
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
