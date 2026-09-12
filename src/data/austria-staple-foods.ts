import type { FoodProduct } from "@/lib/food/food-product-types";

/**
 * Generic Austrian & fitness staples — per-100g reference macros (BLS/EU style).
 * No invented specialty SKUs. Branded barcode products remain Open Food Facts.
 */
type Row = {
  name: string;
  brand: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
};

const ROWS: Row[] = [
  // Breakfast / bread
  { name: "Semmel", brand: "Österreich", calories: 270, proteinG: 9, carbsG: 52, fatG: 2.5, fiberG: 2.5 },
  { name: "Kornspitz", brand: "Österreich", calories: 285, proteinG: 10, carbsG: 48, fatG: 5, fiberG: 5 },
  { name: "Vollkornbrot", brand: "Grundnahrungsmittel", calories: 230, proteinG: 8, carbsG: 40, fatG: 3.5, fiberG: 7 },
  { name: "Schwarzbrot", brand: "Österreich", calories: 210, proteinG: 6, carbsG: 42, fatG: 1.5, fiberG: 8 },
  { name: "Mischbrot", brand: "Österreich", calories: 240, proteinG: 7.5, carbsG: 46, fatG: 2.5, fiberG: 4 },
  { name: "Butter", brand: "Grundnahrungsmittel", calories: 740, proteinG: 0.7, carbsG: 0.6, fatG: 82 },
  { name: "Marmelade", brand: "Grundnahrungsmittel", calories: 250, proteinG: 0.4, carbsG: 62, fatG: 0.1 },
  { name: "Honig", brand: "Grundnahrungsmittel", calories: 304, proteinG: 0.3, carbsG: 82, fatG: 0 },
  { name: "Schinken", brand: "Grundnahrungsmittel", calories: 145, proteinG: 21, carbsG: 1, fatG: 6 },
  { name: "Käse", brand: "Grundnahrungsmittel", calories: 350, proteinG: 25, carbsG: 1, fatG: 27 },
  { name: "Joghurt natur", brand: "Grundnahrungsmittel", calories: 62, proteinG: 3.5, carbsG: 4.7, fatG: 3.5 },
  { name: "Topfen", brand: "Österreich", calories: 67, proteinG: 12, carbsG: 4, fatG: 0.2 },
  { name: "Magertopfen", brand: "Österreich", calories: 67, proteinG: 12, carbsG: 4, fatG: 0.2 },
  { name: "Haferflocken", brand: "Grundnahrungsmittel", calories: 379, proteinG: 13, carbsG: 67, fatG: 7, fiberG: 10 },
  { name: "Müsli", brand: "Grundnahrungsmittel", calories: 370, proteinG: 10, carbsG: 62, fatG: 7, fiberG: 8 },
  { name: "Ei", brand: "Grundnahrungsmittel", calories: 155, proteinG: 13, carbsG: 1.1, fatG: 11 },
  { name: "Eiklar", brand: "Grundnahrungsmittel", calories: 52, proteinG: 11, carbsG: 0.7, fatG: 0.2 },
  // Protein
  { name: "Hühnerbrust", brand: "Grundnahrungsmittel", calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
  { name: "Hähnchenbrust", brand: "Grundnahrungsmittel", calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
  { name: "Hühnerfilet", brand: "Grundnahrungsmittel", calories: 110, proteinG: 23, carbsG: 0, fatG: 1.5 },
  { name: "Putenbrust", brand: "Grundnahrungsmittel", calories: 104, proteinG: 24, carbsG: 0, fatG: 1 },
  { name: "Rindfleisch mager", brand: "Grundnahrungsmittel", calories: 137, proteinG: 26, carbsG: 0, fatG: 4 },
  { name: "Schweinefilet", brand: "Grundnahrungsmittel", calories: 143, proteinG: 26, carbsG: 0, fatG: 4 },
  { name: "Thunfisch", brand: "Grundnahrungsmittel", calories: 116, proteinG: 26, carbsG: 0, fatG: 1 },
  { name: "Garnelen", brand: "Grundnahrungsmittel", calories: 99, proteinG: 24, carbsG: 0.2, fatG: 0.3 },
  { name: "Skyr natur", brand: "Grundnahrungsmittel", calories: 63, proteinG: 11, carbsG: 4, fatG: 0.2 },
  { name: "Griechischer Joghurt", brand: "Grundnahrungsmittel", calories: 97, proteinG: 9, carbsG: 3.6, fatG: 5 },
  { name: "Hüttenkäse", brand: "Grundnahrungsmittel", calories: 98, proteinG: 11, carbsG: 3.4, fatG: 4.3 },
  { name: "Proteinpudding", brand: "Grundnahrungsmittel", calories: 75, proteinG: 10, carbsG: 6, fatG: 1 },
  { name: "Whey Protein", brand: "Grundnahrungsmittel", calories: 400, proteinG: 80, carbsG: 8, fatG: 6 },
  // Carbs
  { name: "Reis", brand: "Grundnahrungsmittel", calories: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3, fiberG: 0.4 },
  { name: "Basmatireis", brand: "Grundnahrungsmittel", calories: 121, proteinG: 3, carbsG: 25, fatG: 0.4 },
  { name: "Jasminreis", brand: "Grundnahrungsmittel", calories: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3 },
  { name: "Vollkornreis", brand: "Grundnahrungsmittel", calories: 123, proteinG: 2.7, carbsG: 26, fatG: 1, fiberG: 1.8 },
  { name: "Kartoffeln", brand: "Grundnahrungsmittel", calories: 77, proteinG: 2, carbsG: 17, fatG: 0.1, fiberG: 2.2 },
  { name: "Erdäpfel", brand: "Österreich", calories: 77, proteinG: 2, carbsG: 17, fatG: 0.1, fiberG: 2.2 },
  { name: "Süßkartoffeln", brand: "Grundnahrungsmittel", calories: 86, proteinG: 1.6, carbsG: 20, fatG: 0.1, fiberG: 3 },
  { name: "Nudeln", brand: "Grundnahrungsmittel", calories: 158, proteinG: 5.8, carbsG: 31, fatG: 0.9 },
  { name: "Vollkornnudeln", brand: "Grundnahrungsmittel", calories: 148, proteinG: 6, carbsG: 28, fatG: 1.5, fiberG: 4 },
  { name: "Couscous", brand: "Grundnahrungsmittel", calories: 112, proteinG: 3.8, carbsG: 23, fatG: 0.2 },
  { name: "Bulgur", brand: "Grundnahrungsmittel", calories: 83, proteinG: 3.1, carbsG: 19, fatG: 0.2, fiberG: 4.5 },
  { name: "Wrap", brand: "Grundnahrungsmittel", calories: 300, proteinG: 8, carbsG: 50, fatG: 7 },
  // Fats
  { name: "Olivenöl", brand: "Grundnahrungsmittel", calories: 884, proteinG: 0, carbsG: 0, fatG: 100 },
  { name: "Rapsöl", brand: "Grundnahrungsmittel", calories: 884, proteinG: 0, carbsG: 0, fatG: 100 },
  { name: "Avocado", brand: "Grundnahrungsmittel", calories: 160, proteinG: 2, carbsG: 8.5, fatG: 15, fiberG: 6.7 },
  { name: "Erdnussbutter", brand: "Grundnahrungsmittel", calories: 588, proteinG: 25, carbsG: 20, fatG: 50 },
  { name: "Mandeln", brand: "Grundnahrungsmittel", calories: 579, proteinG: 21, carbsG: 22, fatG: 50, fiberG: 12 },
  { name: "Walnüsse", brand: "Grundnahrungsmittel", calories: 654, proteinG: 15, carbsG: 14, fatG: 65, fiberG: 7 },
  { name: "Cashews", brand: "Grundnahrungsmittel", calories: 553, proteinG: 18, carbsG: 30, fatG: 44 },
  // Fruit
  { name: "Apfel", brand: "Grundnahrungsmittel", calories: 52, proteinG: 0.3, carbsG: 14, fatG: 0.2, fiberG: 2.4 },
  { name: "Banane", brand: "Grundnahrungsmittel", calories: 89, proteinG: 1.1, carbsG: 23, fatG: 0.3, fiberG: 2.6 },
  { name: "Erdbeeren", brand: "Grundnahrungsmittel", calories: 32, proteinG: 0.7, carbsG: 7.7, fatG: 0.3, fiberG: 2 },
  { name: "Himbeeren", brand: "Grundnahrungsmittel", calories: 52, proteinG: 1.2, carbsG: 12, fatG: 0.7, fiberG: 6.5 },
  { name: "Heidelbeeren", brand: "Grundnahrungsmittel", calories: 57, proteinG: 0.7, carbsG: 14, fatG: 0.3, fiberG: 2.4 },
  { name: "Mango", brand: "Grundnahrungsmittel", calories: 60, proteinG: 0.8, carbsG: 15, fatG: 0.4, fiberG: 1.6 },
  { name: "Ananas", brand: "Grundnahrungsmittel", calories: 50, proteinG: 0.5, carbsG: 13, fatG: 0.1, fiberG: 1.4 },
  { name: "Orange", brand: "Grundnahrungsmittel", calories: 47, proteinG: 0.9, carbsG: 12, fatG: 0.1, fiberG: 2.4 },
  { name: "Kiwi", brand: "Grundnahrungsmittel", calories: 61, proteinG: 1.1, carbsG: 15, fatG: 0.5, fiberG: 3 },
  { name: "Trauben", brand: "Grundnahrungsmittel", calories: 69, proteinG: 0.7, carbsG: 18, fatG: 0.2, fiberG: 0.9 },
  { name: "Birne", brand: "Grundnahrungsmittel", calories: 57, proteinG: 0.4, carbsG: 15, fatG: 0.1, fiberG: 3.1 },
  { name: "Marille", brand: "Österreich", calories: 48, proteinG: 1.4, carbsG: 11, fatG: 0.4, fiberG: 2 },
  // Veg
  { name: "Brokkoli", brand: "Grundnahrungsmittel", calories: 34, proteinG: 2.8, carbsG: 7, fatG: 0.4, fiberG: 2.6 },
  { name: "Karotten", brand: "Grundnahrungsmittel", calories: 41, proteinG: 0.9, carbsG: 10, fatG: 0.2, fiberG: 2.8 },
  { name: "Paprika", brand: "Grundnahrungsmittel", calories: 31, proteinG: 1, carbsG: 6, fatG: 0.3, fiberG: 2.1 },
  { name: "Gurke", brand: "Grundnahrungsmittel", calories: 15, proteinG: 0.7, carbsG: 3.6, fatG: 0.1, fiberG: 0.5 },
  { name: "Paradeiser", brand: "Österreich", calories: 18, proteinG: 0.9, carbsG: 3.9, fatG: 0.2, fiberG: 1.2 },
  { name: "Zucchini", brand: "Grundnahrungsmittel", calories: 17, proteinG: 1.2, carbsG: 3.1, fatG: 0.3, fiberG: 1 },
  { name: "Spinat", brand: "Grundnahrungsmittel", calories: 23, proteinG: 2.9, carbsG: 3.6, fatG: 0.4, fiberG: 2.2 },
  { name: "Salat", brand: "Grundnahrungsmittel", calories: 15, proteinG: 1.4, carbsG: 2.9, fatG: 0.2, fiberG: 1.3 },
  { name: "Mais", brand: "Grundnahrungsmittel", calories: 96, proteinG: 3.4, carbsG: 21, fatG: 1.5, fiberG: 2.4 },
  { name: "Erbsen", brand: "Grundnahrungsmittel", calories: 81, proteinG: 5.4, carbsG: 14, fatG: 0.4, fiberG: 5.5 },
  { name: "Fisolen", brand: "Österreich", calories: 31, proteinG: 1.8, carbsG: 7, fatG: 0.1, fiberG: 2.7 },
  { name: "Zwiebeln", brand: "Grundnahrungsmittel", calories: 40, proteinG: 1.1, carbsG: 9, fatG: 0.1, fiberG: 1.7 },
  { name: "Schwammerl", brand: "Österreich", calories: 22, proteinG: 3.1, carbsG: 3.3, fatG: 0.3, fiberG: 1 },
  // AT dishes (composite ranking)
  { name: "Wiener Schnitzel", brand: "Österreichisches Gericht", calories: 250, proteinG: 18, carbsG: 12, fatG: 14 },
  { name: "Tafelspitz", brand: "Österreichisches Gericht", calories: 168, proteinG: 26, carbsG: 0, fatG: 7 },
  { name: "Kaiserschmarrn", brand: "Österreichisches Gericht", calories: 265, proteinG: 8, carbsG: 35, fatG: 10 },
  { name: "Käsespätzle", brand: "Österreichisches Gericht", calories: 210, proteinG: 10, carbsG: 22, fatG: 9 },
  { name: "Gulasch", brand: "Österreichisches Gericht", calories: 145, proteinG: 12, carbsG: 6, fatG: 8 },
  { name: "Erdäpfelgulasch", brand: "Österreichisches Gericht", calories: 95, proteinG: 2.5, carbsG: 14, fatG: 3.5 },
  { name: "Tiroler Gröstl", brand: "Österreichisches Gericht", calories: 165, proteinG: 9, carbsG: 15, fatG: 8 },
  { name: "Kaspressknödel", brand: "Österreichisches Gericht", calories: 220, proteinG: 11, carbsG: 20, fatG: 10 },
  { name: "Semmelknödel", brand: "Österreichisches Gericht", calories: 175, proteinG: 6, carbsG: 28, fatG: 4.5 },
  { name: "Leberkäse", brand: "Österreichisches Gericht", calories: 290, proteinG: 13, carbsG: 3, fatG: 25 },
  { name: "Fleischlaibchen", brand: "Österreichisches Gericht", calories: 240, proteinG: 16, carbsG: 8, fatG: 16 },
  { name: "Backhendl", brand: "Österreichisches Gericht", calories: 245, proteinG: 20, carbsG: 10, fatG: 14 },
  { name: "Schweinsbraten", brand: "Österreichisches Gericht", calories: 255, proteinG: 22, carbsG: 0, fatG: 18 },
  { name: "Zwiebelrostbraten", brand: "Österreichisches Gericht", calories: 210, proteinG: 24, carbsG: 4, fatG: 11 },
  { name: "Frittatensuppe", brand: "Österreichisches Gericht", calories: 55, proteinG: 3, carbsG: 6, fatG: 2 },
  { name: "Grießnockerlsuppe", brand: "Österreichisches Gericht", calories: 48, proteinG: 2.5, carbsG: 6, fatG: 1.5 },
  { name: "Apfelstrudel", brand: "Österreichisches Gericht", calories: 210, proteinG: 3, carbsG: 32, fatG: 8 },
  { name: "Topfenstrudel", brand: "Österreichisches Gericht", calories: 220, proteinG: 8, carbsG: 28, fatG: 9 },
  { name: "Germknödel", brand: "Österreichisches Gericht", calories: 230, proteinG: 6, carbsG: 40, fatG: 5 },
  { name: "Marillenknödel", brand: "Österreichisches Gericht", calories: 195, proteinG: 5, carbsG: 32, fatG: 5.5 },
];

function toProduct(r: Row): FoodProduct {
  return {
    name: r.name,
    brand: r.brand,
    calories: r.calories,
    proteinG: r.proteinG,
    carbsG: r.carbsG,
    fatG: r.fatG,
    fiberG: r.fiberG ?? null,
    servingG: 100,
    servingLabel: "100 g",
    source: "local",
    category: r.brand.includes("Gericht") ? "DISH" : "STAPLE",
  };
}

const PRODUCTS = ROWS.map(toProduct);

export const AUSTRIA_STAPLE_COUNT = PRODUCTS.length;

export function searchAustriaStapleFoods(
  query: string,
  limit = 24
): FoodProduct[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  return PRODUCTS.filter((p) => {
    const hay = `${p.name} ${p.brand ?? ""}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  })
    .slice(0, limit)
    .map((p) => ({ ...p }));
}
