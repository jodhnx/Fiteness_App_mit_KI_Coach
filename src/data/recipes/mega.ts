import { R, type FitnessRecipe, type RecipeMealSlot, type RecipeTag } from "./types";

/**
 * Large procedural catalog extension — unique dishes for scale/pagination demos.
 * Images resolved via RECIPE_IMAGE_BY_ID fallbacks / meal-slot defaults.
 */

type Spec = {
  id: string;
  name: string;
  mealSlot: RecipeMealSlot;
  tags: RecipeTag[];
  prepMinutes: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  emoji: string;
  accent: string;
  description: string;
  ingredients: { name: string; amount: string; grams?: number }[];
  steps: string[];
};

const ACCENTS = [
  "from-cyan-500/25 to-zinc-900/40",
  "from-orange-500/25 to-zinc-900/40",
  "from-rose-500/25 to-zinc-900/40",
  "from-emerald-500/25 to-zinc-900/40",
  "from-violet-500/25 to-zinc-900/40",
  "from-amber-500/25 to-zinc-900/40",
] as const;

function buildBatch(): Spec[] {
  const specs: Spec[] = [];

  const breakfast: Array<[string, string, string, number, number, number, number]> = [
    ["skyr-berry-bowl", "Skyr Beeren Bowl", "🥣", 280, 32, 24, 4],
    ["egg-white-omelette", "Eiweiß-Omelett", "🥚", 220, 28, 6, 8],
    ["protein-bagel", "Protein Bagel", "🥯", 390, 30, 42, 10],
    ["cottage-tomato", "Hüttenkäse Tomate", "🍅", 250, 28, 12, 8],
    ["banana-protein-toast", "Bananen Protein Toast", "🍌", 340, 24, 48, 6],
    ["turkey-egg-muffin", "Puten-Egg-Muffins", "🧁", 310, 34, 8, 14],
    ["quinoa-breakfast", "Quinoa Frühstück", "🌾", 360, 22, 46, 10],
    ["smoked-salmon-egg", "Räucherlachs & Ei", "🐟", 380, 32, 6, 22],
    ["protein-crepes", "Protein Crêpes", "🥞", 320, 30, 34, 8],
    ["apple-cinnamon-oats", "Apfel-Zimt Hafer", "🍎", 350, 26, 48, 8],
    ["tofu-scramble", "Tofu Scramble", "🧈", 290, 24, 16, 14],
    ["whey-porridge-pb", "Whey Porridge PB", "🥜", 410, 38, 40, 12],
  ];

  breakfast.forEach(([id, name, emoji, cal, p, c, f], i) => {
    specs.push({
      id: `mega-${id}`,
      name,
      mealSlot: "BREAKFAST",
      tags: p >= 30 ? ["high-protein", "muscle-gain"] : ["quick"],
      prepMinutes: 8 + (i % 5) * 2,
      calories: cal,
      proteinG: p,
      carbsG: c,
      fatG: f,
      fiberG: 4 + (i % 4),
      emoji,
      accent: ACCENTS[i % ACCENTS.length],
      description: `${name} — fitnessfreundlich und schnell zubereitet.`,
      ingredients: [
        { name: "Hauptsorte", amount: "1 Portion", grams: 200 },
        { name: "Proteinquelle", amount: "1", grams: 120 },
      ],
      steps: ["Zutaten vorbereiten.", "Zubereiten.", "Servieren."],
    });
  });

  const lunch: Array<[string, string, string, number, number, number, number]> = [
    ["grilled-chicken-salad", "Gegrillter Hähnchen-Salat", "🥗", 420, 45, 18, 16],
    ["turkey-quinoa", "Pute Quinoa Bowl", "🦃", 480, 42, 44, 14],
    ["salmon-asparagus", "Lachs Spargel", "🥦", 460, 40, 12, 26],
    ["beef-stir-fry", "Rinder-Gemüse-Pfanne", "🥩", 510, 44, 28, 22],
    ["chickpea-curry", "Kichererbsen-Curry", "🍛", 430, 22, 52, 14],
    ["tuna-pasta", "Thunfisch Pasta", "🍝", 520, 38, 58, 12],
    ["chicken-couscous", "Hähnchen Couscous", "🍗", 490, 40, 48, 14],
    ["shrimp-rice", "Garnelen Reis", "🦐", 450, 36, 46, 10],
    ["lentil-salad", "Linsen-Salat", "🌿", 380, 24, 42, 12],
    ["pork-tenderloin", "Schweinsfilet Gemüse", "🍖", 470, 42, 16, 22],
    ["falafel-bowl", "Falafel Bowl", "🧆", 440, 20, 48, 18],
    ["chicken-soup", "Protein Hühnersuppe", "🍲", 320, 34, 22, 8],
    ["steak-salad", "Steak Salat", "🥬", 490, 46, 14, 24],
    ["veggie-pasta", "Gemüse Pasta Protein", "🍜", 460, 28, 58, 12],
    ["duck-rice", "Ente mit Reis", "🦆", 540, 38, 42, 24],
  ];

  lunch.forEach(([id, name, emoji, cal, p, c, f], i) => {
    specs.push({
      id: `mega-${id}`,
      name,
      mealSlot: "LUNCH",
      tags: [
        ...(p >= 35 ? (["high-protein"] as RecipeTag[]) : []),
        ...(cal <= 400 ? (["low-calorie", "fat-loss"] as RecipeTag[]) : []),
        ...(cal >= 480 ? (["muscle-gain"] as RecipeTag[]) : []),
      ],
      prepMinutes: 15 + (i % 6) * 3,
      calories: cal,
      proteinG: p,
      carbsG: c,
      fatG: f,
      fiberG: 5 + (i % 5),
      emoji,
      accent: ACCENTS[(i + 2) % ACCENTS.length],
      description: `${name} — ausgewogen für Trainingstage.`,
      ingredients: [
        { name: "Protein", amount: "150 g", grams: 150 },
        { name: "Beilage", amount: "120 g", grams: 120 },
        { name: "Gemüse", amount: "150 g", grams: 150 },
      ],
      steps: ["Protein garen.", "Beilage zubereiten.", "Anrichten."],
    });
  });

  const dinner: Array<[string, string, string, number, number, number, number]> = [
    ["cod-potatoes", "Kabeljau Kartoffeln", "🥔", 430, 38, 36, 10],
    ["chicken-zucchini", "Hähnchen Zucchini", "🥒", 390, 42, 14, 14],
    ["turkey-chili", "Puten Chili", "🌶️", 410, 40, 32, 12],
    ["salmon-broccoli", "Lachs Brokkoli", "🥦", 470, 40, 10, 28],
    ["tofu-stir", "Tofu Gemüse Wok", "🥡", 360, 26, 28, 16],
    ["lean-beef-bowl", "Mageres Rind Bowl", "🥣", 500, 46, 38, 18],
    ["egg-veggie-bake", "Ei-Gemüse Auflauf", "🥘", 340, 28, 16, 16],
    ["shrimp-zucchini", "Garnelen Zucchini", "🦐", 320, 34, 12, 12],
    ["chicken-soup-dinner", "Abend Hühnersuppe", "🍲", 300, 32, 20, 8],
    ["protein-tacos", "Protein Tacos", "🌮", 450, 36, 40, 14],
    ["veggie-burger-night", "Veggie Protein Burger", "🍔", 420, 30, 38, 14],
    ["white-fish-rice", "Weißfisch Reis", "🐟", 440, 38, 42, 10],
  ];

  dinner.forEach(([id, name, emoji, cal, p, c, f], i) => {
    specs.push({
      id: `mega-${id}`,
      name,
      mealSlot: "DINNER",
      tags: [
        ...(p >= 35 ? (["high-protein"] as RecipeTag[]) : []),
        ...(cal <= 380 ? (["low-calorie", "fat-loss"] as RecipeTag[]) : []),
        "quick",
      ],
      prepMinutes: 18 + (i % 5) * 2,
      calories: cal,
      proteinG: p,
      carbsG: c,
      fatG: f,
      fiberG: 4 + (i % 4),
      emoji,
      accent: ACCENTS[(i + 1) % ACCENTS.length],
      description: `${name} — abendtauglich und sättigend.`,
      ingredients: [
        { name: "Hauptzutat", amount: "160 g", grams: 160 },
        { name: "Gemüse", amount: "200 g", grams: 200 },
      ],
      steps: ["Vorbereiten.", "Garen.", "Würzen und servieren."],
    });
  });

  const snacks: Array<[string, string, string, number, number, number, number]> = [
    ["protein-bar-homemade", "Protein Riegel", "🍫", 180, 18, 14, 6],
    ["apple-pb", "Apfel mit Erdnussbutter", "🍎", 220, 8, 24, 12],
    ["tuna-rice-cake", "Thunfisch Reiswaffel", "🍘", 160, 18, 12, 4],
    ["skyr-honey", "Skyr Honig", "🥛", 190, 22, 16, 2],
    ["beef-jerky-snack", "Beef Jerky Snack", "🥓", 140, 22, 4, 4],
    ["hummus-carrot", "Hummus Karotten", "🥕", 170, 8, 18, 8],
    ["protein-hot-choc", "Protein Heiße Schoko", "☕", 150, 20, 12, 3],
    ["egg-snack", "Hartgekochte Eier", "🥚", 140, 12, 1, 10],
    ["cottage-pineapple", "Hüttenkäse Ananas", "🍍", 180, 24, 16, 2],
    ["whey-water", "Whey Shake Classic", "🥤", 120, 24, 3, 1],
    ["almonds-portion", "Mandeln Portion", "🥜", 200, 7, 6, 18],
    ["rice-pudding-pro", "Reisporridge Protein", "🍚", 240, 20, 32, 4],
  ];

  snacks.forEach(([id, name, emoji, cal, p, c, f], i) => {
    specs.push({
      id: `mega-${id}`,
      name,
      mealSlot: "SNACK",
      tags: [
        "quick",
        ...(p >= 18 ? (["high-protein"] as RecipeTag[]) : []),
        ...(cal <= 180 ? (["low-calorie"] as RecipeTag[]) : []),
      ],
      prepMinutes: 2 + (i % 4),
      calories: cal,
      proteinG: p,
      carbsG: c,
      fatG: f,
      emoji,
      accent: ACCENTS[(i + 3) % ACCENTS.length],
      description: `${name} — schneller Snack zwischen den Mahlzeiten.`,
      ingredients: [{ name: "Snack", amount: "1 Portion", grams: 100 }],
      steps: ["Fertig machen.", "Genießen."],
    });
  });

  // Meal-prep oriented batch
  for (let n = 1; n <= 24; n++) {
    const slot: RecipeMealSlot =
      n % 4 === 1 ? "BREAKFAST" : n % 4 === 2 ? "LUNCH" : n % 4 === 3 ? "DINNER" : "SNACK";
    const protein = 28 + (n % 20);
    const cal = 320 + n * 7;
    specs.push({
      id: `mega-mealprep-${n}`,
      name: `Meal Prep Box ${n}`,
      mealSlot: slot,
      tags: ["high-protein", "muscle-gain", "quick"],
      prepMinutes: 25,
      calories: cal,
      proteinG: protein,
      carbsG: 35 + (n % 15),
      fatG: 10 + (n % 8),
      fiberG: 5,
      emoji: "📦",
      accent: ACCENTS[n % ACCENTS.length],
      description: `Vorbereitete Meal-Prep Box #${n} für die Woche.`,
      ingredients: [
        { name: "Hähnchen oder Alternative", amount: "150 g", grams: 150 },
        { name: "Reis/Kartoffeln", amount: "120 g", grams: 120 },
        { name: "Gemüsemix", amount: "150 g", grams: 150 },
      ],
      steps: ["Batch kochen.", "Portionieren.", "Kühlen und aufwärmen."],
    });
  }

  return specs;
}

export const MEGA_RECIPES: FitnessRecipe[] = buildBatch().map((s) => R(s));
