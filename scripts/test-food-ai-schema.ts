/**
 * Unit tests for Food AI Zod schema — no OpenAI, no network.
 * Run: npx tsx scripts/test-food-ai-schema.ts
 */
import assert from "node:assert/strict";
import {
  foodAiResponseSchema,
  foodAiItemsFromParsed,
  foodAiTotals,
} from "../src/lib/food/food-ai-schema";

function ok(name: string) {
  console.log(`  ✓ ${name}`);
}

console.log("Food AI schema tests");

{
  const parsed = foodAiResponseSchema.parse({
    foods: [
      {
        name: "Pizza Margherita",
        estimatedGrams: 250,
        calories: 650,
        protein: 25,
        carbs: 75,
        fat: 25,
        confidence: 0.87,
      },
    ],
  });
  assert.equal(parsed.foods.length, 1);
  assert.equal(parsed.foods[0].proteinG, 25);
  assert.equal(parsed.foods[0].carbsG, 75);
  assert.equal(parsed.foods[0].fatG, 25);
  ok("accepts foods[] with protein/carbs/fat");
}

{
  const parsed = foodAiResponseSchema.parse({
    items: [
      {
        name: "Apfel",
        estimatedGrams: 180,
        calories: 95,
        proteinG: 0.5,
        carbsG: 25,
        fatG: 0.3,
      },
    ],
  });
  assert.equal(parsed.foods[0].name, "Apfel");
  ok("accepts legacy items[] aliases");
}

{
  const empty = foodAiResponseSchema.parse({ foods: [] });
  assert.equal(empty.foods.length, 0);
  ok("empty foods = no food detected");
}

{
  const bad = foodAiResponseSchema.safeParse({
    foods: [{ name: "", estimatedGrams: 10, calories: 1 }],
  });
  assert.equal(bad.success, false);
  ok("rejects empty name");
}

{
  const bad = foodAiResponseSchema.safeParse({
    foods: [{ name: "X", estimatedGrams: 0, calories: 10, protein: 1, carbs: 1, fat: 1 }],
  });
  assert.equal(bad.success, false);
  ok("rejects zero grams");
}

{
  const bad = foodAiResponseSchema.safeParse({
    foods: "not-an-array",
  });
  assert.equal(bad.success, false);
  ok("rejects malformed AI response");
}

{
  const parsed = foodAiResponseSchema.parse({
    foods: [
      { name: "A", estimatedGrams: 100, calories: 200, protein: 10, carbs: 20, fat: 5 },
      { name: "B", estimatedGrams: 50, calories: 100, protein: 5, carbs: 10, fat: 2 },
    ],
  });
  const items = foodAiItemsFromParsed(parsed.foods);
  const totals = foodAiTotals(items);
  assert.equal(totals.calories, 300);
  assert.equal(totals.proteinG, 15);
  assert.equal(items[0].baseCalories, 200);
  ok("totals + base macros for rescale");
}

{
  const freeText = foodAiResponseSchema.safeParse("Pizza ist lecker");
  assert.equal(freeText.success, false);
  ok("rejects free-form non-object");
}

console.log("\nAll Food AI schema tests passed.");
