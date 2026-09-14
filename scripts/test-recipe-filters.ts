/**
 * Recipe filter combinators + sort ranking.
 * Run: npx tsx scripts/test-recipe-filters.ts
 */
import { queryRecipeCatalog } from "../src/lib/recipes/catalog-query";
import { FITNESS_RECIPES, searchFitnessRecipes } from "../src/data/recipes";

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

console.log("Recipe Filter / Sort Tests\n");

assert("catalog not empty", FITNESS_RECIPES.length > 50);

const hpLc = searchFitnessRecipes("", ["high-protein", "low-calorie"]);
assert(
  "high-protein + low-calorie all match",
  hpLc.length > 0 &&
    hpLc.every(
      (r) =>
        (r.tags.includes("high-protein") || r.proteinG >= 35) &&
        (r.tags.includes("low-calorie") || r.calories <= 350)
    )
);

const hpBf = searchFitnessRecipes("", ["high-protein", "BREAKFAST"]);
assert(
  "high-protein + breakfast",
  hpBf.length > 0 && hpBf.every((r) => r.mealSlot === "BREAKFAST")
);

const cutLc = searchFitnessRecipes("", ["cutting", "low-calorie"]);
assert(
  "cutting + low-calorie when present",
  cutLc.every(
    (r) =>
      r.tags.includes("cutting") &&
      (r.tags.includes("low-calorie") || r.calories <= 350)
  )
);

const byProtein = queryRecipeCatalog({ sort: "protein", limit: 10 });
assert(
  "protein sort descending",
  byProtein.recipes.length >= 2 &&
    byProtein.recipes[0].proteinG >= byProtein.recipes[1].proteinG
);

const byCal = queryRecipeCatalog({ sort: "calories", limit: 10 });
assert(
  "calories sort ascending",
  byCal.recipes.length >= 2 &&
    byCal.recipes[0].calories <= byCal.recipes[1].calories
);

const byQuick = queryRecipeCatalog({ sort: "quick", limit: 5 });
assert("quick sort returns items", byQuick.recipes.length > 0);

const expansion = FITNESS_RECIPES.filter((r) => r.id.startsWith("exp-"));
assert("expansion recipes present", expansion.length >= 8);
assert(
  "expansion macros positive",
  expansion.every((r) => r.calories > 0 && r.proteinG > 0)
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
