/**
 * Regression: nutrition calendar helpers + Austria staple search ranking.
 */
import {
  buildMonthGrid,
  nutritionDashboardCacheKeyForDay,
  ymdFromParts,
  yearMonthKey,
} from "../src/lib/nutrition-calendar";
import { NUTRITION_DASHBOARD_CACHE_KEY } from "../src/lib/nutrition-sync";
import { searchAustriaStapleFoods, AUSTRIA_STAPLE_COUNT } from "../src/data/austria-staple-foods";
import { isLikelyCompositeFood, isLikelyStapleFood, rankFoodSearchResults } from "../src/lib/food/food-search-rank";
import { FITNESS_RECIPES, RECIPE_FILTERS } from "../src/data/recipes";
import { queryRecipeCatalog } from "../src/lib/recipes/catalog-query";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}`);
    failed++;
  }
}

console.log("Nutrition calendar + Austria foods + recipes\n");

{
  const grid = buildMonthGrid(2026, 8); // Sept 2026
  check("sept 2026 has days", grid.filter((d) => d != null).length === 30);
  check("monday-first padding", grid.length % 7 === 0);
  check("ymd helper", ymdFromParts(2026, 8, 8) === "2026-09-08");
  check("yearMonth", yearMonthKey(2026, 8) === "2026-09");
}

{
  // Use a fixed "today" by checking key format only
  const hist = nutritionDashboardCacheKeyForDay("2020-01-01");
  check(
    "historical cache key scoped",
    hist === `${NUTRITION_DASHBOARD_CACHE_KEY}:2020-01-01`
  );
}

{
  check("austria staple count >= 80", AUSTRIA_STAPLE_COUNT >= 80);
  const rice = searchAustriaStapleFoods("reis", 20);
  check("reis finds staples", rice.some((p) => /reis/i.test(p.name)));
  const chicken = searchAustriaStapleFoods("hühner", 20);
  check(
    "hühner finds breast before dish ranking helper",
    chicken.some((p) => /brust|filet/i.test(p.name))
  );
  check(
    "wiener schnitzel is composite",
    isLikelyCompositeFood("Wiener Schnitzel", "Österreichisches Gericht")
  );
  check(
    "hühnerbrust is staple",
    isLikelyStapleFood("Hühnerbrust", "Grundnahrungsmittel")
  );

  const ranked = rankFoodSearchResults(
    [
      {
        name: "Chicken Sandwich",
        brand: "Restaurant",
        calories: 300,
        proteinG: 20,
        carbsG: 30,
        fatG: 10,
        fiberG: null,
        servingG: 100,
        source: "local",
      },
      {
        name: "Hühnerbrust",
        brand: "Grundnahrungsmittel",
        calories: 165,
        proteinG: 31,
        carbsG: 0,
        fatG: 3.6,
        fiberG: null,
        servingG: 100,
        source: "local",
      },
      {
        name: "Wiener Schnitzel",
        brand: "Österreichisches Gericht",
        calories: 250,
        proteinG: 18,
        carbsG: 12,
        fatG: 14,
        fiberG: null,
        servingG: 100,
        source: "local",
      },
    ],
    "hühnerfleisch"
  );
  check("staple ranks first for hühnerfleisch", ranked[0]?.name === "Hühnerbrust");
}

{
  check("recipe filters include austrian", RECIPE_FILTERS.some((f) => f.id === "austrian"));
  check("recipe filters include high-protein", RECIPE_FILTERS.some((f) => f.id === "high-protein"));
  check("catalog has austria recipes", FITNESS_RECIPES.some((r) => r.id.startsWith("at-")));
  const at = queryRecipeCatalog({ filters: ["austrian"], limit: 50 });
  check("austrian filter returns recipes", at.total >= 15);
  const hp = queryRecipeCatalog({ filters: ["high-protein"], limit: 5 });
  check("high-protein filter works", hp.recipes.every((r) => r.proteinG >= 30 || r.tags.includes("high-protein")));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
