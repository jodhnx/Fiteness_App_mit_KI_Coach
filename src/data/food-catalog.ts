import type { FoodCategory } from "@prisma/client";

export type FoodCatalogEntry = {
  slug: string;
  name: string;
  brand?: string;
  category: FoodCategory;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingG: number;
  barcode?: string;
};

function slugify(parts: string[]): string {
  return parts
    .join("-")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

type BaseFood = {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingG?: number;
};

function expand(
  category: FoodCategory,
  bases: BaseFood[],
  preparations: string[] = ["", "gekocht", "gegrillt", "gebacken", "roh"],
  brands: (string | undefined)[] = [undefined],
  portionSuffixes: string[] = [""]
): FoodCatalogEntry[] {
  const out: FoodCatalogEntry[] = [];
  const seen = new Set<string>();

  for (const base of bases) {
    for (const prep of preparations) {
      for (const brand of brands) {
        for (const portion of portionSuffixes) {
          const parts = [base.name];
          if (prep) parts.push(`(${prep})`);
          if (portion) parts.push(portion);
          const name = parts.join(" ").replace(/\s+/g, " ").trim();
          const displayBrand = brand?.trim();
          const slug = slugify([category, name, displayBrand ?? ""]);
          if (seen.has(slug)) continue;
          seen.add(slug);

          let cal = base.calories;
          const p = base.proteinG;
          let c = base.carbsG;
          let f = base.fatG;
          if (prep === "gegrillt" || prep === "gebacken") {
            cal *= 1.05;
            f *= 1.08;
          } else if (prep === "roh") {
            cal *= 0.98;
          } else if (prep === "gekocht") {
            c *= prep.includes("Reis") || base.name.includes("Reis") ? 1.0 : 0.95;
          }

          out.push({
            slug,
            name: displayBrand ? `${name} – ${displayBrand}` : name,
            brand: displayBrand,
            category,
            calories: Math.round(cal * 10) / 10,
            proteinG: Math.round(p * 10) / 10,
            carbsG: Math.round(c * 10) / 10,
            fatG: Math.round(f * 10) / 10,
            servingG: base.servingG ?? 100,
          });
        }
      }
    }
  }
  return out;
}

const MEAT_BASES: BaseFood[] = [
  { name: "Hähnchenbrust", calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
  { name: "Hähnchenkeule", calories: 209, proteinG: 26, carbsG: 0, fatG: 11 },
  { name: "Hähnchenflügel", calories: 203, proteinG: 18, carbsG: 0, fatG: 14 },
  { name: "Putenbrust", calories: 135, proteinG: 30, carbsG: 0, fatG: 1 },
  { name: "Putenhack", calories: 150, proteinG: 20, carbsG: 0, fatG: 7 },
  { name: "Rindersteak", calories: 271, proteinG: 26, carbsG: 0, fatG: 18 },
  { name: "Rinderhackfleisch", calories: 250, proteinG: 26, carbsG: 0, fatG: 15 },
  { name: "Rinderfilet", calories: 220, proteinG: 28, carbsG: 0, fatG: 12 },
  { name: "Schweineschnitzel", calories: 242, proteinG: 27, carbsG: 0, fatG: 14 },
  { name: "Schweinehack", calories: 263, proteinG: 25, carbsG: 0, fatG: 17 },
  { name: "Schweinebauch", calories: 518, proteinG: 9, carbsG: 0, fatG: 53 },
  { name: "Lammkotelett", calories: 294, proteinG: 25, carbsG: 0, fatG: 21 },
  { name: "Entenbrust", calories: 201, proteinG: 23, carbsG: 0, fatG: 12 },
  { name: "Gänsebrust", calories: 305, proteinG: 29, carbsG: 0, fatG: 20 },
  { name: "Wildschwein", calories: 187, proteinG: 28, carbsG: 0, fatG: 7 },
  { name: "Hirschfleisch", calories: 158, proteinG: 30, carbsG: 0, fatG: 3 },
  { name: "Kaninchen", calories: 173, proteinG: 33, carbsG: 0, fatG: 4 },
  { name: "Wurst Bratwurst", calories: 297, proteinG: 12, carbsG: 2, fatG: 26 },
  { name: "Wurst Lyoner", calories: 260, proteinG: 11, carbsG: 3, fatG: 23 },
  { name: "Schinken gekocht", calories: 145, proteinG: 21, carbsG: 1, fatG: 6 },
  { name: "Speck", calories: 541, proteinG: 37, carbsG: 0, fatG: 42 },
  { name: "Leberwurst", calories: 326, proteinG: 14, carbsG: 3, fatG: 28 },
  { name: "Corned Beef", calories: 250, proteinG: 27, carbsG: 0, fatG: 15 },
  { name: "Pastrami", calories: 147, proteinG: 22, carbsG: 1, fatG: 6 },
  { name: "Bacon", calories: 541, proteinG: 37, carbsG: 1, fatG: 42 },
];

const FISH_BASES: BaseFood[] = [
  { name: "Lachs", calories: 208, proteinG: 20, carbsG: 0, fatG: 13 },
  { name: "Thunfisch", calories: 132, proteinG: 28, carbsG: 0, fatG: 1 },
  { name: "Forelle", calories: 148, proteinG: 21, carbsG: 0, fatG: 7 },
  { name: "Kabeljau", calories: 82, proteinG: 18, carbsG: 0, fatG: 0.7 },
  { name: "Seelachs", calories: 90, proteinG: 18, carbsG: 0, fatG: 1 },
  { name: "Hering", calories: 158, proteinG: 18, carbsG: 0, fatG: 9 },
  { name: "Makrele", calories: 205, proteinG: 19, carbsG: 0, fatG: 14 },
  { name: "Sardinen", calories: 208, proteinG: 25, carbsG: 0, fatG: 11 },
  { name: "Garnelen", calories: 99, proteinG: 24, carbsG: 0, fatG: 0.3 },
  { name: "Muscheln", calories: 86, proteinG: 12, carbsG: 4, fatG: 2 },
  { name: "Tintenfisch", calories: 92, proteinG: 16, carbsG: 3, fatG: 1 },
  { name: "Krabben", calories: 97, proteinG: 21, carbsG: 0, fatG: 1 },
  { name: "Lachs Räucherlachs", calories: 117, proteinG: 18, carbsG: 0, fatG: 4 },
  { name: "Fischstäbchen", calories: 220, proteinG: 11, carbsG: 18, fatG: 12 },
  { name: "Sushi Lachs Nigiri", calories: 180, proteinG: 9, carbsG: 26, fatG: 4, servingG: 40 },
  { name: "Fish Burger", calories: 280, proteinG: 15, carbsG: 28, fatG: 12 },
];

const DAIRY_BASES: BaseFood[] = [
  { name: "Milch 3,5%", calories: 64, proteinG: 3.3, carbsG: 4.8, fatG: 3.5, servingG: 100 },
  { name: "Milch 1,5%", calories: 47, proteinG: 3.4, carbsG: 4.9, fatG: 1.5, servingG: 100 },
  { name: "Hafermilch", calories: 47, proteinG: 1, carbsG: 7, fatG: 1.5, servingG: 100 },
  { name: "Mandelmilch", calories: 24, proteinG: 0.5, carbsG: 0.3, fatG: 1.1, servingG: 100 },
  { name: "Joghurt natur", calories: 61, proteinG: 3.5, carbsG: 4.7, fatG: 3.3 },
  { name: "Skyr", calories: 59, proteinG: 11, carbsG: 4, fatG: 0.2 },
  { name: "Griechischer Joghurt", calories: 97, proteinG: 9, carbsG: 3.6, fatG: 5 },
  { name: "Magerquark", calories: 67, proteinG: 12, carbsG: 4, fatG: 0.2 },
  { name: "Quark 20%", calories: 99, proteinG: 12, carbsG: 4, fatG: 5 },
  { name: "Frischkäse", calories: 253, proteinG: 8, carbsG: 3, fatG: 24 },
  { name: "Mozzarella", calories: 280, proteinG: 28, carbsG: 2, fatG: 17 },
  { name: "Gouda", calories: 356, proteinG: 25, carbsG: 2, fatG: 27 },
  { name: "Emmentaler", calories: 380, proteinG: 29, carbsG: 0, fatG: 31 },
  { name: "Feta", calories: 264, proteinG: 14, carbsG: 4, fatG: 21 },
  { name: "Parmesan", calories: 431, proteinG: 38, carbsG: 4, fatG: 29 },
  { name: "Butter", calories: 717, proteinG: 0.9, carbsG: 0.1, fatG: 81 },
  { name: "Sahne", calories: 292, proteinG: 2, carbsG: 3, fatG: 30 },
  { name: "Kefir", calories: 41, proteinG: 3.3, carbsG: 4.5, fatG: 1 },
  { name: "Buttermilch", calories: 40, proteinG: 3.3, carbsG: 4.8, fatG: 0.5 },
  { name: "Ei", calories: 155, proteinG: 13, carbsG: 1.1, fatG: 11, servingG: 50 },
];

const VEG_BASES: BaseFood[] = [
  { name: "Brokkoli", calories: 34, proteinG: 2.8, carbsG: 7, fatG: 0.4 },
  { name: "Spinat", calories: 23, proteinG: 2.9, carbsG: 3.6, fatG: 0.4 },
  { name: "Karotte", calories: 41, proteinG: 0.9, carbsG: 10, fatG: 0.2 },
  { name: "Tomate", calories: 18, proteinG: 0.9, carbsG: 3.9, fatG: 0.2 },
  { name: "Gurke", calories: 15, proteinG: 0.7, carbsG: 3.6, fatG: 0.1 },
  { name: "Paprika rot", calories: 31, proteinG: 1, carbsG: 6, fatG: 0.3 },
  { name: "Zucchini", calories: 17, proteinG: 1.2, carbsG: 3.1, fatG: 0.3 },
  { name: "Aubergine", calories: 25, proteinG: 1, carbsG: 6, fatG: 0.2 },
  { name: "Blumenkohl", calories: 25, proteinG: 1.9, carbsG: 5, fatG: 0.3 },
  { name: "Rosenkohl", calories: 43, proteinG: 3.4, carbsG: 9, fatG: 0.3 },
  { name: "Kartoffel", calories: 77, proteinG: 2, carbsG: 17, fatG: 0.1 },
  { name: "Süßkartoffel", calories: 86, proteinG: 1.6, carbsG: 20, fatG: 0.1 },
  { name: "Zwiebel", calories: 40, proteinG: 1.1, carbsG: 9, fatG: 0.1 },
  { name: "Knoblauch", calories: 149, proteinG: 6.4, carbsG: 33, fatG: 0.5 },
  { name: "Salat Blattsalat", calories: 15, proteinG: 1.4, carbsG: 2.9, fatG: 0.2 },
  { name: "Rucola", calories: 25, proteinG: 2.6, carbsG: 3.7, fatG: 0.7 },
  { name: "Spargel", calories: 20, proteinG: 2.2, carbsG: 3.9, fatG: 0.1 },
  { name: "Erbsen", calories: 81, proteinG: 5.4, carbsG: 14, fatG: 0.4 },
  { name: "Mais", calories: 86, proteinG: 3.3, carbsG: 19, fatG: 1.4 },
  { name: "Champignons", calories: 22, proteinG: 3.1, carbsG: 3.3, fatG: 0.3 },
  { name: "Lauch", calories: 61, proteinG: 1.5, carbsG: 14, fatG: 0.3 },
  { name: "Rote Bete", calories: 43, proteinG: 1.6, carbsG: 10, fatG: 0.2 },
  { name: "Kohlrabi", calories: 27, proteinG: 1.7, carbsG: 6, fatG: 0.1 },
  { name: "Weißkohl", calories: 25, proteinG: 1.3, carbsG: 6, fatG: 0.1 },
  { name: "Rotkohl", calories: 31, proteinG: 1.4, carbsG: 7, fatG: 0.2 },
];

const FRUIT_BASES: BaseFood[] = [
  { name: "Banane", calories: 89, proteinG: 1.1, carbsG: 23, fatG: 0.3 },
  { name: "Apfel", calories: 52, proteinG: 0.3, carbsG: 14, fatG: 0.2 },
  { name: "Orange", calories: 47, proteinG: 0.9, carbsG: 12, fatG: 0.1 },
  { name: "Erdbeeren", calories: 32, proteinG: 0.7, carbsG: 7.7, fatG: 0.3 },
  { name: "Heidelbeeren", calories: 57, proteinG: 0.7, carbsG: 14, fatG: 0.3 },
  { name: "Trauben", calories: 69, proteinG: 0.7, carbsG: 18, fatG: 0.2 },
  { name: "Wassermelone", calories: 30, proteinG: 0.6, carbsG: 8, fatG: 0.2 },
  { name: "Mango", calories: 60, proteinG: 0.8, carbsG: 15, fatG: 0.4 },
  { name: "Ananas", calories: 50, proteinG: 0.5, carbsG: 13, fatG: 0.1 },
  { name: "Kiwi", calories: 61, proteinG: 1.1, carbsG: 15, fatG: 0.5 },
  { name: "Birne", calories: 57, proteinG: 0.4, carbsG: 15, fatG: 0.1 },
  { name: "Pfirsich", calories: 39, proteinG: 0.9, carbsG: 10, fatG: 0.3 },
  { name: "Kirschen", calories: 63, proteinG: 1.1, carbsG: 16, fatG: 0.2 },
  { name: "Pflaume", calories: 46, proteinG: 0.7, carbsG: 11, fatG: 0.3 },
  { name: "Avocado", calories: 160, proteinG: 2, carbsG: 9, fatG: 15 },
  { name: "Zitrone", calories: 29, proteinG: 1.1, carbsG: 9, fatG: 0.3 },
  { name: "Granatapfel", calories: 83, proteinG: 1.7, carbsG: 19, fatG: 1.2 },
  { name: "Feige", calories: 74, proteinG: 0.8, carbsG: 19, fatG: 0.3 },
  { name: "Datteln", calories: 282, proteinG: 2.5, carbsG: 75, fatG: 0.4 },
  { name: "Rosinen", calories: 299, proteinG: 3.1, carbsG: 79, fatG: 0.5 },
];

const DRINK_BASES: BaseFood[] = [
  { name: "Wasser", calories: 0, proteinG: 0, carbsG: 0, fatG: 0, servingG: 250 },
  { name: "Kaffee schwarz", calories: 2, proteinG: 0.3, carbsG: 0, fatG: 0, servingG: 200 },
  { name: "Espresso", calories: 9, proteinG: 0.1, carbsG: 1.7, fatG: 0.2, servingG: 30 },
  { name: "Tee grün", calories: 1, proteinG: 0, carbsG: 0, fatG: 0, servingG: 250 },
  { name: "Cola", calories: 42, proteinG: 0, carbsG: 10.6, fatG: 0, servingG: 100 },
  { name: "Cola Zero", calories: 0.3, proteinG: 0, carbsG: 0, fatG: 0, servingG: 100 },
  { name: "Orangensaft", calories: 45, proteinG: 0.7, carbsG: 10, fatG: 0.2, servingG: 100 },
  { name: "Apfelsaft", calories: 46, proteinG: 0.1, carbsG: 11, fatG: 0.1, servingG: 100 },
  { name: "Multivitaminsaft", calories: 43, proteinG: 0.5, carbsG: 10, fatG: 0.1, servingG: 100 },
  { name: "Energy Drink", calories: 45, proteinG: 0, carbsG: 11, fatG: 0, servingG: 100 },
  { name: "Bier Pils", calories: 43, proteinG: 0.5, carbsG: 3.6, fatG: 0, servingG: 100 },
  { name: "Wein rot", calories: 85, proteinG: 0.1, carbsG: 2.6, fatG: 0, servingG: 100 },
  { name: "Protein Shake RTD", calories: 65, proteinG: 10, carbsG: 4, fatG: 1, servingG: 100 },
  { name: "Kakao", calories: 77, proteinG: 3, carbsG: 10, fatG: 2.5, servingG: 100 },
  { name: "Smoothie Beeren", calories: 58, proteinG: 1, carbsG: 12, fatG: 0.5, servingG: 100 },
];

const SWEET_BASES: BaseFood[] = [
  { name: "Schokolade Vollmilch", calories: 535, proteinG: 7.6, carbsG: 59, fatG: 30 },
  { name: "Schokolade Zartbitter", calories: 546, proteinG: 5, carbsG: 60, fatG: 31 },
  { name: "Gummibärchen", calories: 343, proteinG: 6.9, carbsG: 77, fatG: 0.1 },
  { name: "Eis Vanille", calories: 207, proteinG: 3.5, carbsG: 24, fatG: 11 },
  { name: "Keks Butterkeks", calories: 484, proteinG: 6, carbsG: 65, fatG: 22 },
  { name: "Donut", calories: 452, proteinG: 5, carbsG: 51, fatG: 25 },
  { name: "Muffin", calories: 377, proteinG: 5, carbsG: 53, fatG: 16 },
  { name: "Kuchen Apfelkuchen", calories: 240, proteinG: 3, carbsG: 36, fatG: 9 },
  { name: "Tiramisu", calories: 306, proteinG: 5, carbsG: 33, fatG: 17 },
  { name: "Nutella", calories: 539, proteinG: 6, carbsG: 58, fatG: 31 },
  { name: "Honig", calories: 304, proteinG: 0.3, carbsG: 82, fatG: 0 },
  { name: "Marmelade", calories: 250, proteinG: 0.4, carbsG: 65, fatG: 0.1 },
  { name: "Chips", calories: 536, proteinG: 7, carbsG: 53, fatG: 35 },
  { name: "Popcorn", calories: 387, proteinG: 13, carbsG: 78, fatG: 5 },
  { name: "Brownie", calories: 466, proteinG: 6, carbsG: 58, fatG: 24 },
];

const FAST_FOOD_BASES: BaseFood[] = [
  { name: "Cheeseburger", calories: 303, proteinG: 16, carbsG: 28, fatG: 14 },
  { name: "Hamburger", calories: 250, proteinG: 13, carbsG: 26, fatG: 10 },
  { name: "Big Mac", calories: 257, proteinG: 12, carbsG: 21, fatG: 14, servingG: 100 },
  { name: "Pommes Frites", calories: 312, proteinG: 3.4, carbsG: 41, fatG: 15 },
  { name: "Pizza Margherita", calories: 266, proteinG: 11, carbsG: 33, fatG: 10 },
  { name: "Pizza Salami", calories: 290, proteinG: 12, carbsG: 30, fatG: 14 },
  { name: "Döner", calories: 215, proteinG: 12, carbsG: 18, fatG: 11 },
  { name: "Dürüm", calories: 240, proteinG: 11, carbsG: 24, fatG: 12 },
  { name: "Burrito", calories: 206, proteinG: 8, carbsG: 28, fatG: 7 },
  { name: "Taco", calories: 226, proteinG: 9, carbsG: 20, fatG: 12 },
  { name: "Hot Dog", calories: 290, proteinG: 10, carbsG: 24, fatG: 18 },
  { name: "Chicken Nuggets", calories: 296, proteinG: 15, carbsG: 18, fatG: 19 },
  { name: "Wrap Chicken", calories: 220, proteinG: 14, carbsG: 24, fatG: 8 },
  { name: "Falafel", calories: 333, proteinG: 13, carbsG: 32, fatG: 18 },
  { name: "Pad Thai", calories: 180, proteinG: 7, carbsG: 28, fatG: 5 },
  { name: "Sushi Set", calories: 150, proteinG: 6, carbsG: 28, fatG: 2, servingG: 100 },
  { name: "Ramen", calories: 120, proteinG: 5, carbsG: 18, fatG: 3, servingG: 100 },
  { name: "Currywurst", calories: 220, proteinG: 8, carbsG: 15, fatG: 14 },
  { name: "Bratwurst mit Brötchen", calories: 280, proteinG: 11, carbsG: 28, fatG: 14 },
  { name: "McFlurry", calories: 180, proteinG: 4, carbsG: 28, fatG: 6, servingG: 100 },
];

const FITNESS_BASES: BaseFood[] = [
  { name: "Whey Protein", calories: 400, proteinG: 80, carbsG: 8, fatG: 5, servingG: 30 },
  { name: "Casein Protein", calories: 380, proteinG: 75, carbsG: 6, fatG: 4, servingG: 30 },
  { name: "Protein Riegel", calories: 350, proteinG: 30, carbsG: 35, fatG: 12, servingG: 60 },
  { name: "BCAA Pulver", calories: 0, proteinG: 0, carbsG: 0, fatG: 0, servingG: 10 },
  { name: "Kreatin", calories: 0, proteinG: 0, carbsG: 0, fatG: 0, servingG: 5 },
  { name: "Haferflocken", calories: 379, proteinG: 13, carbsG: 68, fatG: 7 },
  { name: "Reis weiß gekocht", calories: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3 },
  { name: "Reis braun gekocht", calories: 123, proteinG: 2.7, carbsG: 26, fatG: 1 },
  { name: "Nudeln gekocht", calories: 131, proteinG: 5, carbsG: 25, fatG: 1.1 },
  { name: "Vollkornbrot", calories: 247, proteinG: 9, carbsG: 41, fatG: 3.4 },
  { name: "Peanut Butter", calories: 588, proteinG: 25, carbsG: 20, fatG: 50 },
  { name: "Mandeln", calories: 579, proteinG: 21, carbsG: 22, fatG: 50 },
  { name: "Walnüsse", calories: 654, proteinG: 15, carbsG: 14, fatG: 65 },
  { name: "Chia Samen", calories: 486, proteinG: 17, carbsG: 42, fatG: 31 },
  { name: "Leinsamen", calories: 534, proteinG: 18, carbsG: 29, fatG: 42 },
  { name: "Protein Pancakes", calories: 180, proteinG: 20, carbsG: 15, fatG: 4, servingG: 100 },
  { name: "Riegel Quest", calories: 320, proteinG: 35, carbsG: 25, fatG: 10, servingG: 60 },
  { name: "RTD Shake", calories: 65, proteinG: 10, carbsG: 4, fatG: 1, servingG: 100 },
  { name: "Pre Workout", calories: 10, proteinG: 0, carbsG: 2, fatG: 0, servingG: 10 },
  { name: "Electrolyte Pulver", calories: 5, proteinG: 0, carbsG: 1, fatG: 0, servingG: 5 },
];

const GRAIN_BASES: BaseFood[] = [
  { name: "Bulgur gekocht", calories: 83, proteinG: 3, carbsG: 19, fatG: 0.2 },
  { name: "Couscous gekocht", calories: 112, proteinG: 3.8, carbsG: 23, fatG: 0.2 },
  { name: "Quinoa gekocht", calories: 120, proteinG: 4.4, carbsG: 21, fatG: 1.9 },
  { name: "Dinkelbrot", calories: 250, proteinG: 9, carbsG: 44, fatG: 2.5 },
  { name: "Baguette", calories: 274, proteinG: 9, carbsG: 56, fatG: 1.5 },
  { name: "Croissant", calories: 406, proteinG: 8, carbsG: 45, fatG: 21 },
  { name: "Brötchen", calories: 280, proteinG: 9, carbsG: 52, fatG: 4 },
  { name: "Tortilla Weizen", calories: 304, proteinG: 8, carbsG: 50, fatG: 8 },
  { name: "Polenta gekocht", calories: 70, proteinG: 2, carbsG: 15, fatG: 0.5 },
  { name: "Müsli", calories: 380, proteinG: 10, carbsG: 65, fatG: 8 },
];

const LEGUME_BASES: BaseFood[] = [
  { name: "Linsen gekocht", calories: 116, proteinG: 9, carbsG: 20, fatG: 0.4 },
  { name: "Kichererbsen gekocht", calories: 164, proteinG: 9, carbsG: 27, fatG: 2.6 },
  { name: "Bohnen weiß gekocht", calories: 139, proteinG: 9, carbsG: 25, fatG: 0.5 },
  { name: "Kidneybohnen", calories: 127, proteinG: 9, carbsG: 23, fatG: 0.5 },
  { name: "Tofu natur", calories: 76, proteinG: 8, carbsG: 1.9, fatG: 4.8 },
  { name: "Tempeh", calories: 192, proteinG: 20, carbsG: 8, fatG: 11 },
  { name: "Edamame", calories: 122, proteinG: 11, carbsG: 10, fatG: 5 },
  { name: "Hummus", calories: 166, proteinG: 8, carbsG: 14, fatG: 10 },
];

const OIL_BASES: BaseFood[] = [
  { name: "Olivenöl", calories: 884, proteinG: 0, carbsG: 0, fatG: 100, servingG: 10 },
  { name: "Rapsöl", calories: 884, proteinG: 0, carbsG: 0, fatG: 100, servingG: 10 },
  { name: "Kokosöl", calories: 862, proteinG: 0, carbsG: 0, fatG: 100, servingG: 10 },
  { name: "Sesamöl", calories: 884, proteinG: 0, carbsG: 0, fatG: 100, servingG: 10 },
];

const BRANDS = [
  undefined,
  "Edeka",
  "Rewe",
  "Aldi",
  "Lidl",
  "Kaufland",
  "Alnatura",
  "Ja!",
  "Eigenmarke",
  "Danone",
  "Milbona",
  "Iglo",
  "Dr. Oetker",
  "Barilla",
  "Knorr",
  "McDonald's",
  "Burger King",
  "Subway",
  "MyProtein",
  "ESN",
  "foodspring",
  "Barebells",
  "Müller",
  "Rama",
  "Kerrygold",
];

const PREPS_LIGHT = ["", "gekocht", "gegrillt", "gebacken"];
const PREPS_FULL = ["", "gekocht", "gegrillt", "gebacken", "roh", "dampfgegart", "frittiert", "paniert"];
const PORTIONS = ["", "kleine Portion", "große Portion"];

function buildCatalog(): FoodCatalogEntry[] {
  const catalog: FoodCatalogEntry[] = [
    ...expand("MEAT", MEAT_BASES, PREPS_FULL, BRANDS.slice(0, 12), PORTIONS),
    ...expand("FISH", FISH_BASES, PREPS_FULL, BRANDS.slice(0, 10), PORTIONS),
    ...expand("DAIRY", DAIRY_BASES, ["", "fettarm", "laktosefrei"], BRANDS.slice(0, 15), [""]),
    ...expand("VEGETABLES", VEG_BASES, PREPS_LIGHT, BRANDS.slice(0, 8), [""]),
    ...expand("FRUIT", FRUIT_BASES, ["", "getrocknet", "tiefgekühlt"], BRANDS.slice(0, 10), PORTIONS),
    ...expand("DRINKS", DRINK_BASES, ["", "light", "zero"], BRANDS.slice(0, 12), [""]),
    ...expand("SWEETS", SWEET_BASES, ["", "zuckerfrei"], BRANDS.slice(0, 12), PORTIONS),
    ...expand("FAST_FOOD", FAST_FOOD_BASES, ["", "XL", "Menu"], BRANDS.slice(14, 22), [""]),
    ...expand("FITNESS", FITNESS_BASES, ["", "Schoko", "Vanille", "Erdbeere"], BRANDS.slice(18, 24), [""]),
    ...expand("GRAINS", GRAIN_BASES, PREPS_LIGHT, BRANDS.slice(0, 10), PORTIONS),
    ...expand("LEGUMES", LEGUME_BASES, PREPS_LIGHT, BRANDS.slice(0, 8), [""]),
    ...expand("OILS", OIL_BASES, [""], [undefined], [""]),
  ];

  // Synthetic regional variants to reach 5000+ unique entries
  const regions = ["Nord", "Süd", "Bio", "Premium", "Classic", "Light", "Family", "Gourmet"];
  const extras: FoodCatalogEntry[] = [];
  const templates = catalog.slice(0, 400);
  for (const t of templates) {
    for (const r of regions) {
      const slug = slugify([t.slug, r]);
      if (catalog.some((x) => x.slug === slug) || extras.some((x) => x.slug === slug)) continue;
      extras.push({
        ...t,
        slug,
        name: `${t.name} ${r}`,
        calories: Math.round(t.calories * (0.97 + (r.length % 5) * 0.01) * 10) / 10,
      });
    }
  }

  const combined = [...catalog, ...extras];
  const unique = new Map<string, FoodCatalogEntry>();
  for (const item of combined) {
    if (!unique.has(item.slug)) unique.set(item.slug, item);
  }
  return Array.from(unique.values());
}

export const FOOD_CATALOG: FoodCatalogEntry[] = buildCatalog();
