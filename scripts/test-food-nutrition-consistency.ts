/**
 * Food search ranking + nutrition preview/save consistency.
 * Run: npx tsx scripts/test-food-nutrition-consistency.ts
 */
import {
  rankFoodSearchResults,
  scoreFoodSearchMatch,
  normalizeSearchText,
  isLikelyCompositeFood,
  isLikelyStapleFood,
} from "../src/lib/food/food-search-rank";
import {
  confirmedMacrosForQuantity,
  foodSnapshotFromConfirmed,
  previewMatchesSnapshot,
} from "../src/lib/food/confirmed-macros";
import { macrosForQuantity, roundMacros } from "../src/lib/food-macros";
import {
  mergeFoodSearchResponses,
  shouldApplySearchResult,
} from "../src/lib/food/food-product-types";
import {
  getCalorieDisplay,
  resolveNutritionDisplayState,
} from "../src/lib/nutrition-display";
import {
  createEmptyNutritionDashboard,
  normalizeNutritionDashboard,
} from "../src/lib/nutrition-defaults";
import { canonicalNutritionForDisplay } from "../src/lib/nutrition-to-home";
import { createEmptyHomeData } from "../src/lib/home-defaults";
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

console.log("Food nutrition consistency + search ranking\n");

{
  const a = getCalorieDisplay(800, 2500);
  assert("2500 − 800 = 1700 remaining", a.remaining === 1700 && a.primaryValue === 1700);
  const b = getCalorieDisplay(0, 2500);
  assert("2500 − 0 = 2500 remaining", b.remaining === 2500 && b.primaryValue === 2500);
}

{
  const food = {
    calories: 165,
    proteinG: 31,
    carbsG: 0,
    fatG: 3.6,
    servingG: 100,
  };
  const preview100 = confirmedMacrosForQuantity(food, 100);
  assert("preview 100g kcal", preview100.calories === 165);
  assert("preview 100g protein", preview100.proteinG === 31);
  assert("preview 100g fat keeps 1 decimal", preview100.fatG === 3.6);

  const preview300 = confirmedMacrosForQuantity(food, 300);
  assert("preview 300g kcal", preview300.calories === 495);
  assert("preview 300g protein 1dp", preview300.proteinG === 93);
  assert("preview 300g carbs 1dp", preview300.carbsG === 0);
  assert("preview 300g fat 1dp", preview300.fatG === 10.8);
  assert(
    "preview matches saved snapshot 300g",
    previewMatchesSnapshot(preview300, 300)
  );
  const snap300 = foodSnapshotFromConfirmed("Hühnerfleisch", preview300, 300);
  const again300 = macrosForQuantity(snap300, 300);
  assert("300g saved kcal === preview", again300.calories === 495);
  assert("300g saved protein === preview", again300.proteinG === 93);
  assert("300g saved fat === preview", again300.fatG === 10.8);

  const preview200 = confirmedMacrosForQuantity(food, 200);
  assert("200g doubles kcal", preview200.calories === 330);
  assert("200g doubles protein", preview200.proteinG === 62);

  assert(
    "preview matches saved snapshot 100g",
    previewMatchesSnapshot(preview100, 100)
  );
  assert(
    "preview matches saved snapshot 150g",
    previewMatchesSnapshot(confirmedMacrosForQuantity(food, 150), 150)
  );

  const snap = foodSnapshotFromConfirmed("Hühnerbrust", preview100, 100);
  const again = macrosForQuantity(snap, 100);
  assert("saved kcal === preview kcal", again.calories === preview100.calories);
  assert("saved protein === preview protein", again.proteinG === preview100.proteinG);
  assert("saved carbs === preview carbs", again.carbsG === preview100.carbsG);
  assert("saved fat === preview fat", again.fatG === preview100.fatG);
}

{
  assert(
    "umlaut normalize",
    normalizeSearchText("Hühnerfleisch") === "huhnerfleisch"
  );
  assert(
    "case normalize",
    normalizeSearchText("REIS") === "reis"
  );
  assert(
    "sandwich is composite",
    isLikelyCompositeFood("Sandwich mit Hühnerfleisch")
  );
  assert(
    "hühnerbrust is staple",
    isLikelyStapleFood("Hühnerbrust", "Standardlebensmittel")
  );

  const rankedChicken = rankFoodSearchResults(
    [
      { name: "Sandwich mit Hühnerfleisch", brand: "Ready Meal" },
      { name: "Hühnerbrust", brand: "Standardlebensmittel" },
      { name: "Chicken Wrap", brand: "Takeaway" },
      { name: "Hühnerfleisch", brand: "Standardlebensmittel" },
    ],
    "hühnerfleisch"
  );
  assert(
    "hühnerfleisch ranks staple first",
    rankedChicken[0].name === "Hühnerfleisch" ||
      rankedChicken[0].name === "Hühnerbrust"
  );
  assert(
    "sandwich not first for hühnerfleisch",
    !rankedChicken[0].name.toLowerCase().includes("sandwich")
  );

  const rankedRice = rankFoodSearchResults(
    [
      { name: "Reispfanne mit Gemüse", brand: null },
      { name: "Curry mit Reis", brand: null },
      { name: "Reis weiß gekocht", brand: "Standardlebensmittel" },
      { name: "Chicken Curry with Rice", brand: "Restaurant" },
    ],
    "reis"
  );
  assert(
    "reis ranks rice staple first",
    rankedRice[0].name.toLowerCase().includes("reis") &&
      !rankedRice[0].name.toLowerCase().includes("pfanne") &&
      !rankedRice[0].name.toLowerCase().includes("curry")
  );
  assert(
    "staple score > dish score",
    scoreFoodSearchMatch(
      { name: "Reis", brand: "Standardlebensmittel" },
      "reis"
    ) >
      scoreFoodSearchMatch({ name: "Reispfanne", brand: null }, "reis")
  );
}

{
  const today = nutritionDayKey();
  const rich = normalizeNutritionDashboard({
    ...createEmptyNutritionDashboard(),
    date: today,
    profileComplete: true,
    targets: {
      calories: 2500,
      proteinG: 180,
      carbsG: 250,
      fatG: 70,
      fiberG: 0,
      waterTargetMl: 2500,
      nutritionGoal: null,
    },
    consumed: {
      calories: 800,
      proteinG: 40,
      carbsG: 60,
      fatG: 20,
      fiberG: 0,
    },
    mealsByType: [
      {
        mealType: "LUNCH",
        mealId: "m1",
        totals: { calories: 800, proteinG: 40, carbsG: 60, fatG: 20 },
        items: [
          {
            id: "i1",
            quantityG: 100,
            food: { name: "Huhn", brand: null },
            calories: 800,
            proteinG: 40,
            carbsG: 60,
            fatG: 20,
          },
        ],
      },
    ],
  });
  const emptyShell = normalizeNutritionDashboard({
    ...createEmptyNutritionDashboard(),
    date: today,
    profileComplete: true,
    targets: { ...rich.targets },
    consumed: {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
    },
  });
  const home = {
    ...createEmptyHomeData(),
    calorieTarget: 2500,
    caloriesIntake: 800,
    nutrition: rich,
  };
  const display = canonicalNutritionForDisplay(emptyShell, home);
  assert(
    "home prefers cached consumed over empty shell",
    display.consumed.calories === 800
  );
  const state = resolveNutritionDisplayState(display);
  assert(
    "remaining 1700 from cache",
    state.kind === "ready" && state.cal.remaining === 1700
  );
}

{
  assert("roundMacros kcal integer, fat 1dp", (() => {
    const r = roundMacros({ calories: 164.7, proteinG: 31.2, carbsG: 0.4, fatG: 3.6 });
    return r.calories === 165 && r.proteinG === 31.2 && r.carbsG === 0.4 && r.fatG === 3.6;
  })());
}

{
  const merged = mergeFoodSearchResponses(
    {
      products: [
        {
          name: "Sandwich mit Hühnerfleisch",
          brand: "Ready",
          calories: 400,
          proteinG: 20,
          carbsG: 40,
          fatG: 10,
          fiberG: null,
          servingG: 100,
          source: "openfoodfacts",
        },
      ],
      suggestions: [],
      query: "hühnerfleisch",
      source: "openfoodfacts",
      offAvailable: true,
    },
    {
      products: [
        {
          name: "Hühnerfleisch",
          brand: "Standardlebensmittel",
          calories: 165,
          proteinG: 31,
          carbsG: 0,
          fatG: 4,
          fiberG: null,
          servingG: 100,
          source: "local",
        },
      ],
      suggestions: [],
      query: "hühnerfleisch",
      source: "local",
      offAvailable: true,
    }
  );
  assert(
    "merge re-ranks staples above dishes",
    merged.products[0]?.name === "Hühnerfleisch"
  );
  assert(
    "stale search response ignored",
    shouldApplySearchResult(1, 2, false) === false
  );
  assert(
    "aborted search ignored",
    shouldApplySearchResult(2, 2, true) === false
  );
  assert(
    "latest search applied",
    shouldApplySearchResult(3, 3, false) === true
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
