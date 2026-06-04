/**
 * Terminal-Test: Open Food Facts + lokale Suche
 * Ausführen: npx tsx scripts/test-food-search.ts clever
 */
import { searchOpenFoodFacts } from "../src/lib/food/open-food-facts-client";

async function main() {
  const query = process.argv[2] ?? "red bull";
  console.log("=== Food Search Diagnostic ===");
  console.log("Query:", query);
  const off = await searchOpenFoodFacts(query, 5);
  console.log("\n--- OFF Result ---");
  console.log("Source:", off.source);
  console.log("Error:", off.error ?? "none");
  console.log("Products:", off.products.length);
  off.products.slice(0, 3).forEach((p, i) => {
    console.log(
      `  ${i + 1}. ${p.name} (${p.brand}) ${p.calories} kcal AT-score=${p.austriaScore}`
    );
  });
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
