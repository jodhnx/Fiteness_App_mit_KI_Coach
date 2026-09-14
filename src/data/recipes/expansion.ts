/**
 * Curated catalog expansion — macros derived from ingredient grams
 * using standard USDA/BLS-style estimates (per 100g where applicable).
 */
import { R, type FitnessRecipe } from "./types";

/** Approx kcal/P/C/F per gram for common ingredients (kcal, p, c, f per 100g → /100). */
function macrosFromIngredients(
  items: { grams: number; kcal100: number; p100: number; c100: number; f100: number }[]
) {
  let calories = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  for (const i of items) {
    const f = i.grams / 100;
    calories += i.kcal100 * f;
    proteinG += i.p100 * f;
    carbsG += i.c100 * f;
    fatG += i.f100 * f;
  }
  return {
    calories: Math.round(calories),
    proteinG: Math.round(proteinG),
    carbsG: Math.round(carbsG),
    fatG: Math.round(fatG),
  };
}

const WHEY = { kcal100: 380, p100: 80, c100: 6, f100: 4 };
const OATS = { kcal100: 370, p100: 13, c100: 60, f100: 7 };
const EGG = { kcal100: 140, p100: 13, c100: 1, f100: 10 };
const EGG_WHITE = { kcal100: 52, p100: 11, c100: 1, f100: 0 };
const SKYR = { kcal100: 60, p100: 10, c100: 4, f100: 0.2 };
const CHICKEN = { kcal100: 110, p100: 23, c100: 0, f100: 2 };
const TURKEY = { kcal100: 105, p100: 24, c100: 0, f100: 1.5 };
const RICE = { kcal100: 130, p100: 2.7, c100: 28, f100: 0.3 };
const PASTA = { kcal100: 350, p100: 13, c100: 70, f100: 1.5 };
const BEEF_LEAN = { kcal100: 140, p100: 21, c100: 0, f100: 6 };
const POTATO = { kcal100: 77, p100: 2, c100: 17, f100: 0.1 };
const BANANA = { kcal100: 89, p100: 1.1, c100: 23, f100: 0.3 };
const BERRIES = { kcal100: 45, p100: 0.7, c100: 10, f100: 0.3 };
const MILK = { kcal100: 47, p100: 3.4, c100: 4.8, f100: 1.5 };
const BREAD = { kcal100: 250, p100: 9, c100: 45, f100: 3 };
const TORTILLA = { kcal100: 290, p100: 8, c100: 48, f100: 7 };
const TOPFEN = { kcal100: 70, p100: 12, c100: 4, f100: 0.5 };
const FLOUR = { kcal100: 350, p100: 10, c100: 75, f100: 1 };

export const EXPANSION_RECIPES: FitnessRecipe[] = [
  R({
    id: "exp-breakfast-burrito",
    name: "Breakfast Burrito Protein",
    mealSlot: "BREAKFAST",
    tags: ["high-protein", "pre-workout"],
    prepMinutes: 8,
    cookMinutes: 10,
    emoji: "🌯",
    accent: "from-amber-400/30 to-orange-500/20",
    description: "Ei, Eiklar und Pute im Wrap — satt und proteinreich.",
    ingredients: [
      { name: "Vollkorn-Tortilla", amount: "1", grams: 60 },
      { name: "Ei (M)", amount: "1", grams: 50 },
      { name: "Eiklar", amount: "80 g", grams: 80 },
      { name: "Putenbrust (gewürfelt)", amount: "60 g", grams: 60 },
      { name: "Paprika", amount: "40 g", grams: 40 },
    ],
    steps: [
      "Ei und Eiklar verquirlen, in der Pfanne stocken lassen.",
      "Pute und Paprika kurz anbraten.",
      "Alles in die Tortilla füllen und einrollen.",
    ],
    ...macrosFromIngredients([
      { grams: 60, ...TORTILLA },
      { grams: 50, ...EGG },
      { grams: 80, ...EGG_WHITE },
      { grams: 60, ...TURKEY },
      { grams: 40, kcal100: 30, p100: 1, c100: 6, f100: 0.2 },
    ]),
  }),
  R({
    id: "exp-french-toast-classic",
    name: "French Toast Light",
    mealSlot: "BREAKFAST",
    tags: ["high-protein", "low-fat"],
    prepMinutes: 5,
    cookMinutes: 8,
    emoji: "🍞",
    accent: "from-yellow-400/30 to-amber-500/20",
    description: "Toast in Ei-Eiklar-Mix — klassisch, aber leichter.",
    ingredients: [
      { name: "Vollkorntoast", amount: "2 Scheiben", grams: 60 },
      { name: "Ei (M)", amount: "1", grams: 50 },
      { name: "Eiklar", amount: "60 g", grams: 60 },
      { name: "Milch 1,5 %", amount: "30 ml", grams: 30 },
      { name: "Zimt", amount: "1 TL" },
    ],
    steps: [
      "Ei, Eiklar, Milch und Zimt verquirlen.",
      "Toast wenden und in der Pfanne goldbraun braten.",
    ],
    ...macrosFromIngredients([
      { grams: 60, ...BREAD },
      { grams: 50, ...EGG },
      { grams: 60, ...EGG_WHITE },
      { grams: 30, ...MILK },
    ]),
  }),
  R({
    id: "exp-turkey-pasta",
    name: "Turkey Pasta",
    mealSlot: "DINNER",
    tags: ["high-protein", "meal-prep", "post-workout"],
    prepMinutes: 10,
    cookMinutes: 18,
    emoji: "🍝",
    accent: "from-rose-400/30 to-red-500/20",
    description: "Putenhack mit Vollkornpasta und Tomatensauce.",
    ingredients: [
      { name: "Vollkornnudeln (trocken)", amount: "70 g", grams: 70 },
      { name: "Putenhack", amount: "120 g", grams: 120 },
      { name: "Passierte Tomaten", amount: "150 g", grams: 150 },
      { name: "Zwiebel", amount: "40 g", grams: 40 },
    ],
    spices: ["Oregano", "Knoblauch", "Pfeffer", "Salz"],
    steps: [
      "Nudeln al dente kochen.",
      "Hack und Zwiebel anbraten, Tomaten dazu, würzen.",
      "Mit Nudeln vermengen.",
    ],
    ...macrosFromIngredients([
      { grams: 70, ...PASTA },
      { grams: 120, ...TURKEY },
      { grams: 150, kcal100: 25, p100: 1, c100: 5, f100: 0.2 },
      { grams: 40, kcal100: 40, p100: 1, c100: 9, f100: 0.1 },
    ]),
  }),
  R({
    id: "exp-pasta-bolognese",
    name: "Pasta Bolognese Lean",
    mealSlot: "LUNCH",
    tags: ["high-protein", "meal-prep", "bulking"],
    prepMinutes: 12,
    cookMinutes: 25,
    emoji: "🥩",
    accent: "from-red-500/25 to-orange-500/20",
    description: "Mageres Rinderhack mit Tomatensauce und Pasta.",
    ingredients: [
      { name: "Vollkornnudeln (trocken)", amount: "80 g", grams: 80 },
      { name: "Rinderhack mager", amount: "120 g", grams: 120 },
      { name: "Passierte Tomaten", amount: "180 g", grams: 180 },
      { name: "Zwiebel & Knoblauch", amount: "50 g", grams: 50 },
    ],
    steps: [
      "Hack mit Zwiebel anbraten.",
      "Tomaten dazu und 15 Min köcheln.",
      "Mit gekochter Pasta servieren.",
    ],
    ...macrosFromIngredients([
      { grams: 80, ...PASTA },
      { grams: 120, ...BEEF_LEAN },
      { grams: 180, kcal100: 25, p100: 1, c100: 5, f100: 0.2 },
      { grams: 50, kcal100: 40, p100: 1, c100: 9, f100: 0.1 },
    ]),
  }),
  R({
    id: "exp-protein-muffins",
    name: "Protein Muffins",
    mealSlot: "SNACK",
    tags: ["high-protein", "meal-prep", "dessert"],
    prepMinutes: 10,
    cookMinutes: 18,
    ovenTempC: 180,
    emoji: "🧁",
    accent: "from-violet-400/30 to-fuchsia-500/20",
    description: "Hafer-Whey-Muffins — Meal-Prep Snack für unterwegs.",
    ingredients: [
      { name: "Haferflocken (gemahlen)", amount: "60 g", grams: 60 },
      { name: "Whey Protein", amount: "30 g", grams: 30 },
      { name: "Ei (M)", amount: "1", grams: 50 },
      { name: "Eiklar", amount: "60 g", grams: 60 },
      { name: "Banane", amount: "½", grams: 50 },
      { name: "Beeren", amount: "40 g", grams: 40 },
    ],
    steps: [
      "Alles vermengen, in 4 Muffinformen füllen.",
      "Bei 180 °C ca. 18 Min backen.",
    ],
    ...macrosFromIngredients([
      { grams: 60, ...OATS },
      { grams: 30, ...WHEY },
      { grams: 50, ...EGG },
      { grams: 60, ...EGG_WHITE },
      { grams: 50, ...BANANA },
      { grams: 40, ...BERRIES },
    ]),
  }),
  R({
    id: "exp-protein-bar-oat",
    name: "Protein Bar Hafer",
    mealSlot: "SNACK",
    tags: ["high-protein", "quick", "meal-prep"],
    prepMinutes: 12,
    cookMinutes: 0,
    restMinutes: 60,
    emoji: "🍫",
    accent: "from-stone-400/30 to-amber-600/20",
    description: "No-Bake Riegel aus Hafer, Whey und etwas Erdnussmus.",
    ingredients: [
      { name: "Haferflocken", amount: "50 g", grams: 50 },
      { name: "Whey Protein", amount: "30 g", grams: 30 },
      { name: "Erdnussmus", amount: "15 g", grams: 15 },
      { name: "Milch 1,5 %", amount: "40 ml", grams: 40 },
    ],
    steps: [
      "Alles zu einem Teig kneten, in Form pressen.",
      "Mindestens 60 Min kühlen, dann portionieren.",
    ],
    ...macrosFromIngredients([
      { grams: 50, ...OATS },
      { grams: 30, ...WHEY },
      { grams: 15, kcal100: 590, p100: 25, c100: 15, f100: 50 },
      { grams: 40, ...MILK },
    ]),
  }),
  R({
    id: "exp-topfen-palatschinken",
    name: "Protein Palatschinken Topfen",
    mealSlot: "BREAKFAST",
    tags: ["high-protein", "austrian", "low-fat"],
    prepMinutes: 10,
    cookMinutes: 12,
    emoji: "🥞",
    accent: "from-sky-400/30 to-blue-500/20",
    description: "Österreichische Palatschinken mit Topfen-Whey-Füllung.",
    ingredients: [
      { name: "Mehl", amount: "40 g", grams: 40 },
      { name: "Eiklar", amount: "80 g", grams: 80 },
      { name: "Milch 1,5 %", amount: "80 ml", grams: 80 },
      { name: "Magertopfen", amount: "100 g", grams: 100 },
      { name: "Whey Protein", amount: "15 g", grams: 15 },
    ],
    steps: [
      "Aus Mehl, Eiklar und Milch einen dünnen Teig rühren.",
      "Palatschinken ausbacken.",
      "Topfen mit Whey mischen und füllen.",
    ],
    ...macrosFromIngredients([
      { grams: 40, ...FLOUR },
      { grams: 80, ...EGG_WHITE },
      { grams: 80, ...MILK },
      { grams: 100, ...TOPFEN },
      { grams: 15, ...WHEY },
    ]),
  }),
  R({
    id: "exp-chicken-potato-bowl",
    name: "Chicken Potato Bowl",
    mealSlot: "DINNER",
    tags: ["high-protein", "meal-prep", "post-workout"],
    prepMinutes: 10,
    cookMinutes: 30,
    emoji: "🍗",
    accent: "from-emerald-400/30 to-teal-500/20",
    description: "Hähnchen, Kartoffeln und Brokkoli — einfache Meal-Prep Bowl.",
    ingredients: [
      { name: "Hähnchenbrust", amount: "150 g", grams: 150 },
      { name: "Kartoffeln", amount: "200 g", grams: 200 },
      { name: "Brokkoli", amount: "150 g", grams: 150 },
    ],
    spices: ["Paprika", "Knoblauch", "Salz", "Pfeffer"],
    steps: [
      "Kartoffeln würfeln und im Ofen garen.",
      "Hähnchen würzen und braten oder backen.",
      "Brokkoli dämpfen, alles in der Bowl anrichten.",
    ],
    ...macrosFromIngredients([
      { grams: 150, ...CHICKEN },
      { grams: 200, ...POTATO },
      { grams: 150, kcal100: 34, p100: 2.8, c100: 7, f100: 0.4 },
    ]),
  }),
  R({
    id: "exp-skyr-overnight-berries",
    name: "Skyr Overnight Berry Jar",
    mealSlot: "BREAKFAST",
    tags: ["high-protein", "low-calorie", "meal-prep", "cutting"],
    prepMinutes: 5,
    cookMinutes: 0,
    restMinutes: 480,
    emoji: "🫐",
    accent: "from-blue-400/30 to-indigo-500/20",
    description: "Skyr, Hafer und Beeren — über Nacht ziehen lassen.",
    ingredients: [
      { name: "Skyr", amount: "200 g", grams: 200 },
      { name: "Haferflocken", amount: "40 g", grams: 40 },
      { name: "Beeren", amount: "80 g", grams: 80 },
      { name: "Whey Protein", amount: "15 g", grams: 15 },
    ],
    steps: [
      "Alles verrühren, abdecken und über Nacht kühlen.",
      "Morgens umrühren und kalt genießen.",
    ],
    ...macrosFromIngredients([
      { grams: 200, ...SKYR },
      { grams: 40, ...OATS },
      { grams: 80, ...BERRIES },
      { grams: 15, ...WHEY },
    ]),
  }),
  R({
    id: "exp-beef-rice-bowl",
    name: "Beef Rice Power Bowl",
    mealSlot: "LUNCH",
    tags: ["high-protein", "bulking", "meal-prep"],
    prepMinutes: 10,
    cookMinutes: 20,
    emoji: "🥩",
    accent: "from-orange-500/25 to-red-600/20",
    description: "Mageres Rind mit Reis und Gemüse — klassischer Aufbau-Teller.",
    ingredients: [
      { name: "Rinderhüfte", amount: "140 g", grams: 140 },
      { name: "Basmatireis (trocken)", amount: "70 g", grams: 70 },
      { name: "Gemüsemix", amount: "150 g", grams: 150 },
    ],
    steps: [
      "Reis kochen.",
      "Rind scharf anbraten, Gemüse dazu.",
      "Mit Reis servieren.",
    ],
    ...macrosFromIngredients([
      { grams: 140, ...BEEF_LEAN },
      { grams: 70, kcal100: 350, p100: 7, c100: 78, f100: 0.6 },
      { grams: 150, kcal100: 35, p100: 2, c100: 6, f100: 0.3 },
    ]),
  }),
];
