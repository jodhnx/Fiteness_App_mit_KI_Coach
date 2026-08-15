/** Static fitness recipe catalog — shared across accounts; favorites are per-user. */

export type RecipeMealSlot = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export type RecipeTag =
  | "high-protein"
  | "low-calorie"
  | "muscle-gain"
  | "fat-loss"
  | "quick";

export type RecipeIngredient = {
  name: string;
  amount: string;
  grams?: number;
};

export type FitnessRecipe = {
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
  /** Soft gradient / emoji stand-in when no photo CDN */
  emoji: string;
  accent: string;
  imageUrl?: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  description: string;
};

export const RECIPE_FILTERS: { id: string; label: string }[] = [
  { id: "BREAKFAST", label: "Frühstück" },
  { id: "LUNCH", label: "Mittagessen" },
  { id: "DINNER", label: "Abendessen" },
  { id: "SNACK", label: "Snack" },
  { id: "high-protein", label: "High Protein" },
  { id: "low-calorie", label: "Low Calorie" },
  { id: "muscle-gain", label: "Muskelaufbau" },
  { id: "fat-loss", label: "Abnehmen" },
  { id: "quick", label: "Schnell" },
];

export const FITNESS_RECIPES: FitnessRecipe[] = [
  // —— Frühstück ——
  {
    id: "protein-pancakes",
    name: "Protein Pancakes",
    mealSlot: "BREAKFAST",
    tags: ["high-protein", "muscle-gain", "quick"],
    prepMinutes: 15,
    calories: 420,
    proteinG: 42,
    carbsG: 38,
    fatG: 10,
    fiberG: 4,
    emoji: "🥞",
    accent: "from-amber-500/30 to-orange-600/10",
    description: "Fluffige Pancakes mit hohem Proteingehalt — ideal nach dem Aufstehen.",
    ingredients: [
      { name: "Haferflocken", amount: "40 g", grams: 40 },
      { name: "Whey Protein (Vanille)", amount: "30 g", grams: 30 },
      { name: "Ei", amount: "1 Stück", grams: 50 },
      { name: "Eiklar", amount: "2 Stück", grams: 66 },
      { name: "Backpulver", amount: "½ TL" },
      { name: "Banane", amount: "½ Stück", grams: 50 },
    ],
    steps: [
      "Haferflocken und Protein in eine Schüssel geben.",
      "Ei, Eiklar und Banane hinzufügen und glatt rühren.",
      "Backpulver unterheben.",
      "In einer antihaftbeschichteten Pfanne goldbraun ausbacken.",
      "Mit Beeren oder zuckerfreiem Sirup servieren.",
    ],
  },
  {
    id: "protein-oats",
    name: "Protein Oats",
    mealSlot: "BREAKFAST",
    tags: ["high-protein", "muscle-gain", "quick"],
    prepMinutes: 8,
    calories: 380,
    proteinG: 35,
    carbsG: 42,
    fatG: 8,
    fiberG: 6,
    emoji: "🥣",
    accent: "from-yellow-500/25 to-amber-700/10",
    description: "Schneller Haferbrei mit Protein — sättigend und trainingsfreundlich.",
    ingredients: [
      { name: "Haferflocken", amount: "50 g", grams: 50 },
      { name: "Milch 1,5 % oder Haferdrink", amount: "200 ml" },
      { name: "Whey Protein", amount: "25 g", grams: 25 },
      { name: "Zimt", amount: "1 Prise" },
      { name: "Beeren", amount: "80 g", grams: 80 },
    ],
    steps: [
      "Haferflocken mit Flüssigkeit 3–4 Minuten köcheln.",
      "Vom Herd nehmen und Protein unterrühren.",
      "Mit Zimt und Beeren toppen.",
    ],
  },
  {
    id: "overnight-oats",
    name: "Overnight Oats",
    mealSlot: "BREAKFAST",
    tags: ["high-protein", "fat-loss", "quick"],
    prepMinutes: 5,
    calories: 350,
    proteinG: 28,
    carbsG: 40,
    fatG: 9,
    fiberG: 7,
    emoji: "🫙",
    accent: "from-sky-500/25 to-cyan-700/10",
    description: "Abends vorbereiten, morgens genießen — ohne Stress.",
    ingredients: [
      { name: "Haferflocken", amount: "45 g", grams: 45 },
      { name: "Skyr / Magerquark", amount: "120 g", grams: 120 },
      { name: "Milch oder Wasser", amount: "100 ml" },
      { name: "Chiasamen", amount: "10 g", grams: 10 },
      { name: "Honig oder Süßstoff", amount: "nach Geschmack" },
    ],
    steps: [
      "Alles in ein Glas mischen.",
      "Über Nacht im Kühlschrank ziehen lassen.",
      "Morgens umrühren und optional Obst dazugeben.",
    ],
  },
  {
    id: "protein-french-toast",
    name: "Protein French Toast",
    mealSlot: "BREAKFAST",
    tags: ["high-protein", "muscle-gain"],
    prepMinutes: 12,
    calories: 390,
    proteinG: 32,
    carbsG: 36,
    fatG: 12,
    fiberG: 3,
    emoji: "🍞",
    accent: "from-orange-400/30 to-rose-600/10",
    description: "Französischer Toast mit Extra-Protein.",
    ingredients: [
      { name: "Vollkornbrot", amount: "2 Scheiben", grams: 70 },
      { name: "Ei", amount: "1 Stück", grams: 50 },
      { name: "Eiklar", amount: "2 Stück", grams: 66 },
      { name: "Whey Protein", amount: "15 g", grams: 15 },
      { name: "Zimt", amount: "1 TL" },
    ],
    steps: [
      "Ei, Eiklar, Protein und Zimt verquirlen.",
      "Brotscheiben wenden und in der Pfanne braten.",
      "Mit Beeren oder Skyr servieren.",
    ],
  },
  {
    id: "eggs-toast",
    name: "Eier mit Toast",
    mealSlot: "BREAKFAST",
    tags: ["high-protein", "quick", "fat-loss"],
    prepMinutes: 10,
    calories: 320,
    proteinG: 26,
    carbsG: 24,
    fatG: 14,
    fiberG: 4,
    emoji: "🍳",
    accent: "from-yellow-400/30 to-stone-600/10",
    description: "Klassiker — schnell, proteinreich, clean.",
    ingredients: [
      { name: "Eier", amount: "2 Stück", grams: 100 },
      { name: "Vollkorntoast", amount: "1 Scheibe", grams: 35 },
      { name: "Spinat", amount: "50 g", grams: 50 },
      { name: "Tomate", amount: "½ Stück", grams: 60 },
      { name: "Salz, Pfeffer", amount: "nach Geschmack" },
    ],
    steps: [
      "Eier in der Pfanne stocken oder rühren.",
      "Toast toasten, Spinat kurz mitdünsten.",
      "Alles anrichten und würzen.",
    ],
  },
  {
    id: "protein-porridge",
    name: "Protein Porridge",
    mealSlot: "BREAKFAST",
    tags: ["high-protein", "muscle-gain"],
    prepMinutes: 10,
    calories: 410,
    proteinG: 38,
    carbsG: 45,
    fatG: 9,
    fiberG: 5,
    emoji: "♨️",
    accent: "from-amber-400/25 to-red-700/10",
    description: "Cremiger Porridge mit doppeltem Protein-Kick.",
    ingredients: [
      { name: "Haferflocken", amount: "55 g", grams: 55 },
      { name: "Wasser / Milch", amount: "250 ml" },
      { name: "Casein oder Whey", amount: "30 g", grams: 30 },
      { name: "Erdnussmus", amount: "10 g", grams: 10 },
    ],
    steps: [
      "Haferflocken weich kochen.",
      "Protein unterrühren (nicht zu heiß).",
      "Mit Erdnussmus abschmecken.",
    ],
  },
  {
    id: "yogurt-bowl",
    name: "Joghurt-Bowl",
    mealSlot: "BREAKFAST",
    tags: ["high-protein", "fat-loss", "quick", "low-calorie"],
    prepMinutes: 5,
    calories: 280,
    proteinG: 30,
    carbsG: 28,
    fatG: 5,
    fiberG: 4,
    emoji: "🫐",
    accent: "from-blue-400/25 to-violet-700/10",
    description: "Leichte Bowl mit Skyr, Beeren und Crunch.",
    ingredients: [
      { name: "Skyr / Griechischer Joghurt 0,1 %", amount: "200 g", grams: 200 },
      { name: "Beerenmix", amount: "100 g", grams: 100 },
      { name: "Granola light", amount: "15 g", grams: 15 },
      { name: "Honig", amount: "1 TL (optional)" },
    ],
    steps: [
      "Joghurt in eine Schüssel geben.",
      "Beeren und Granola darüber verteilen.",
      "Optional leicht süßen.",
    ],
  },
  // —— Mittag ——
  {
    id: "chicken-rice",
    name: "Chicken & Rice",
    mealSlot: "LUNCH",
    tags: ["high-protein", "muscle-gain"],
    prepMinutes: 25,
    calories: 520,
    proteinG: 48,
    carbsG: 55,
    fatG: 10,
    fiberG: 3,
    emoji: "🍗",
    accent: "from-orange-500/30 to-stone-700/10",
    description: "Bodybuilding-Klassiker: Hähnchen, Reis, Gemüse.",
    ingredients: [
      { name: "Hähnchenbrust", amount: "150 g", grams: 150 },
      { name: "Reis (ungekocht)", amount: "70 g", grams: 70 },
      { name: "Gemüsemix", amount: "100 g", grams: 100 },
      { name: "Olivenöl", amount: "5 ml" },
      { name: "Gewürze", amount: "Paprika, Salz, Pfeffer" },
    ],
    steps: [
      "Reis nach Packungsanleitung kochen.",
      "Hähnchen würzen und anbraten.",
      "Gemüse dazugeben und kurz mitdünsten.",
      "Mit Reis anrichten und servieren.",
    ],
  },
  {
    id: "chicken-teriyaki",
    name: "Chicken Teriyaki",
    mealSlot: "LUNCH",
    tags: ["high-protein", "muscle-gain"],
    prepMinutes: 20,
    calories: 490,
    proteinG: 45,
    carbsG: 48,
    fatG: 11,
    fiberG: 2,
    emoji: "🍱",
    accent: "from-red-500/25 to-amber-600/10",
    description: "Süße Teriyaki-Note mit hohem Proteinanteil.",
    ingredients: [
      { name: "Hähnchenbrust", amount: "160 g", grams: 160 },
      { name: "Reis", amount: "60 g", grams: 60 },
      { name: "Teriyaki-Sauce light", amount: "20 g", grams: 20 },
      { name: "Brokkoli", amount: "100 g", grams: 100 },
      { name: "Sesam", amount: "5 g", grams: 5 },
    ],
    steps: [
      "Reis und Brokkoli garen.",
      "Hähnchen anbraten, mit Sauce glasieren.",
      "Alles anrichten, Sesam darüber.",
    ],
  },
  {
    id: "chicken-wrap",
    name: "Chicken Wrap",
    mealSlot: "LUNCH",
    tags: ["high-protein", "quick", "fat-loss"],
    prepMinutes: 12,
    calories: 430,
    proteinG: 40,
    carbsG: 35,
    fatG: 12,
    fiberG: 5,
    emoji: "🌮",
    accent: "from-lime-500/25 to-emerald-700/10",
    description: "Wrap to go — perfekt fürs Büro.",
    ingredients: [
      { name: "Vollkorn-Wrap", amount: "1 Stück", grams: 60 },
      { name: "Hähnchenbrust (gegart)", amount: "120 g", grams: 120 },
      { name: "Salat / Gurke", amount: "80 g", grams: 80 },
      { name: "Light-Joghurt-Dressing", amount: "20 g", grams: 20 },
    ],
    steps: [
      "Wrap mit Dressing bestreichen.",
      "Hähnchen und Gemüse füllen.",
      "Einrollen und servieren oder mitnehmen.",
    ],
  },
  {
    id: "beef-rice",
    name: "Beef & Rice",
    mealSlot: "LUNCH",
    tags: ["high-protein", "muscle-gain"],
    prepMinutes: 25,
    calories: 560,
    proteinG: 46,
    carbsG: 50,
    fatG: 18,
    fiberG: 3,
    emoji: "🥩",
    accent: "from-rose-500/30 to-stone-700/10",
    description: "Mageres Rind mit Reis für Muskelaufbau.",
    ingredients: [
      { name: "Rinderhack mager / Rumpsteak", amount: "140 g", grams: 140 },
      { name: "Reis", amount: "70 g", grams: 70 },
      { name: "Paprika", amount: "100 g", grams: 100 },
      { name: "Zwiebel", amount: "½ Stück" },
    ],
    steps: [
      "Reis kochen.",
      "Fleisch anbraten, Gemüse dazugeben.",
      "Würzen und mit Reis servieren.",
    ],
  },
  {
    id: "pasta-chicken",
    name: "Pasta mit Hähnchen",
    mealSlot: "LUNCH",
    tags: ["high-protein", "muscle-gain"],
    prepMinutes: 22,
    calories: 540,
    proteinG: 44,
    carbsG: 58,
    fatG: 12,
    fiberG: 6,
    emoji: "🍝",
    accent: "from-amber-500/25 to-red-700/10",
    description: "Vollkornpasta mit Hähnchen und leichter Sauce.",
    ingredients: [
      { name: "Vollkornpasta", amount: "70 g", grams: 70 },
      { name: "Hähnchenbrust", amount: "140 g", grams: 140 },
      { name: "Tomatensauce light", amount: "100 g", grams: 100 },
      { name: "Basilikum", amount: "nach Geschmack" },
    ],
    steps: [
      "Pasta al dente kochen.",
      "Hähnchen anbraten, Sauce erhitzen.",
      "Alles vermengen und anrichten.",
    ],
  },
  {
    id: "chicken-curry",
    name: "Chicken Curry",
    mealSlot: "LUNCH",
    tags: ["high-protein", "muscle-gain"],
    prepMinutes: 30,
    calories: 510,
    proteinG: 42,
    carbsG: 48,
    fatG: 14,
    fiberG: 5,
    emoji: "🍛",
    accent: "from-yellow-500/30 to-orange-700/10",
    description: "Mildes Curry mit Reis — würzig und sättigend.",
    ingredients: [
      { name: "Hähnchenbrust", amount: "150 g", grams: 150 },
      { name: "Reis", amount: "60 g", grams: 60 },
      { name: "Currypaste light / Pulver", amount: "1 TL" },
      { name: "Kokosmilch light", amount: "80 ml" },
      { name: "Gemüse", amount: "120 g", grams: 120 },
    ],
    steps: [
      "Reis kochen.",
      "Hähnchen und Gemüse anbraten.",
      "Mit Curry und Kokosmilch ablöschen, 8 Minuten köcheln.",
      "Mit Reis servieren.",
    ],
  },
  {
    id: "burrito-bowl",
    name: "Burrito Bowl",
    mealSlot: "LUNCH",
    tags: ["high-protein", "fat-loss"],
    prepMinutes: 20,
    calories: 480,
    proteinG: 40,
    carbsG: 45,
    fatG: 14,
    fiberG: 8,
    emoji: "🥗",
    accent: "from-emerald-500/25 to-lime-700/10",
    description: "Bowl mit Reis, Bohnen, Hähnchen und Salsa.",
    ingredients: [
      { name: "Hähnchen", amount: "120 g", grams: 120 },
      { name: "Reis", amount: "50 g", grams: 50 },
      { name: "Schwarze Bohnen", amount: "80 g", grams: 80 },
      { name: "Mais / Salsa", amount: "60 g", grams: 60 },
      { name: "Salat", amount: "50 g", grams: 50 },
    ],
    steps: [
      "Reis und Bohnen vorbereiten.",
      "Hähnchen würzen und braten.",
      "Alles in einer Bowl schichten.",
    ],
  },
  // —— Abend ——
  {
    id: "high-protein-pizza",
    name: "High-Protein Pizza",
    mealSlot: "DINNER",
    tags: ["high-protein", "muscle-gain"],
    prepMinutes: 25,
    calories: 480,
    proteinG: 45,
    carbsG: 40,
    fatG: 14,
    fiberG: 4,
    emoji: "🍕",
    accent: "from-red-500/30 to-orange-600/10",
    description: "Pizza-Feeling mit Quark-Boden und viel Protein.",
    ingredients: [
      { name: "Magerquark", amount: "150 g", grams: 150 },
      { name: "Ei", amount: "1 Stück", grams: 50 },
      { name: "Haferflocken", amount: "40 g", grams: 40 },
      { name: "Tomatensauce", amount: "60 g", grams: 60 },
      { name: "Hähnchen / Light-Käse", amount: "80 g", grams: 80 },
    ],
    steps: [
      "Quark, Ei und Hafer zu einem Teig kneten.",
      "Flach ausrollen und 8 Minuten vorbacken.",
      "Belag drauf, weitere 10 Minuten backen.",
    ],
  },
  {
    id: "chicken-bowl-dinner",
    name: "Chicken Bowl",
    mealSlot: "DINNER",
    tags: ["high-protein", "fat-loss", "low-calorie"],
    prepMinutes: 18,
    calories: 390,
    proteinG: 42,
    carbsG: 28,
    fatG: 10,
    fiberG: 6,
    emoji: "🥙",
    accent: "from-teal-500/25 to-cyan-700/10",
    description: "Leichte Abend-Bowl mit viel Gemüse.",
    ingredients: [
      { name: "Hähnchenbrust", amount: "150 g", grams: 150 },
      { name: "Süßkartoffel", amount: "100 g", grams: 100 },
      { name: "Brokkoli / Zucchini", amount: "150 g", grams: 150 },
      { name: "Kräuterquark light", amount: "40 g", grams: 40 },
    ],
    steps: [
      "Süßkartoffel garen oder braten.",
      "Hähnchen und Gemüse zubereiten.",
      "Mit Quark anrichten.",
    ],
  },
  {
    id: "omelette",
    name: "Omelett",
    mealSlot: "DINNER",
    tags: ["high-protein", "quick", "low-calorie", "fat-loss"],
    prepMinutes: 10,
    calories: 290,
    proteinG: 32,
    carbsG: 6,
    fatG: 15,
    fiberG: 2,
    emoji: "🥚",
    accent: "from-yellow-400/30 to-amber-700/10",
    description: "Proteinreiches Omelett für den Abend.",
    ingredients: [
      { name: "Eier", amount: "2 Stück", grams: 100 },
      { name: "Eiklar", amount: "2 Stück", grams: 66 },
      { name: "Paprika / Champignons", amount: "100 g", grams: 100 },
      { name: "Light-Käse", amount: "20 g", grams: 20 },
    ],
    steps: [
      "Eier und Eiklar verquirlen.",
      "Gemüse anbraten, Eimasse dazugeben.",
      "Käse darüber, zusammenklappen.",
    ],
  },
  {
    id: "potatoes-chicken",
    name: "Kartoffeln mit Hähnchen",
    mealSlot: "DINNER",
    tags: ["high-protein", "muscle-gain"],
    prepMinutes: 30,
    calories: 500,
    proteinG: 44,
    carbsG: 48,
    fatG: 12,
    fiberG: 5,
    emoji: "🥔",
    accent: "from-amber-600/25 to-stone-700/10",
    description: "Ofenkartoffeln mit würzigem Hähnchen.",
    ingredients: [
      { name: "Kartoffeln", amount: "200 g", grams: 200 },
      { name: "Hähnchenbrust", amount: "150 g", grams: 150 },
      { name: "Olivenöl", amount: "5 ml" },
      { name: "Kräuter der Provence", amount: "1 TL" },
    ],
    steps: [
      "Kartoffeln würfeln und im Ofen garen.",
      "Hähnchen würzen und braten oder mitbacken.",
      "Zusammen anrichten.",
    ],
  },
  {
    id: "protein-pasta-dinner",
    name: "Protein Pasta",
    mealSlot: "DINNER",
    tags: ["high-protein", "muscle-gain"],
    prepMinutes: 18,
    calories: 470,
    proteinG: 48,
    carbsG: 42,
    fatG: 10,
    fiberG: 8,
    emoji: "🍜",
    accent: "from-violet-500/25 to-fuchsia-700/10",
    description: "Proteinpasta mit magerem Hack oder Hähnchen.",
    ingredients: [
      { name: "Protein-/Linsenpasta", amount: "70 g", grams: 70 },
      { name: "Hähnchen oder Putenhack", amount: "120 g", grams: 120 },
      { name: "Tomatensauce", amount: "120 g", grams: 120 },
    ],
    steps: [
      "Pasta kochen.",
      "Fleisch anbraten, Sauce dazugeben.",
      "Vermengen und servieren.",
    ],
  },
  // —— Snacks ——
  {
    id: "protein-pancakes-snack",
    name: "Mini Protein-Pancakes",
    mealSlot: "SNACK",
    tags: ["high-protein", "quick", "muscle-gain"],
    prepMinutes: 12,
    calories: 220,
    proteinG: 24,
    carbsG: 18,
    fatG: 5,
    fiberG: 2,
    emoji: "🧁",
    accent: "from-pink-500/25 to-amber-600/10",
    description: "Kleine Pancakes als Zwischenmahlzeit.",
    ingredients: [
      { name: "Whey Protein", amount: "25 g", grams: 25 },
      { name: "Eiklar", amount: "2 Stück", grams: 66 },
      { name: "Haferflocken", amount: "20 g", grams: 20 },
    ],
    steps: [
      "Alles verrühren.",
      "Kleine Pancakes in der Pfanne backen.",
    ],
  },
  {
    id: "protein-mug-cake",
    name: "Protein-Mug-Cake",
    mealSlot: "SNACK",
    tags: ["high-protein", "quick", "muscle-gain"],
    prepMinutes: 5,
    calories: 210,
    proteinG: 26,
    carbsG: 16,
    fatG: 5,
    fiberG: 2,
    emoji: "☕",
    accent: "from-amber-800/30 to-stone-800/10",
    description: "1-Minuten-Kuchen aus der Mikrowelle.",
    ingredients: [
      { name: "Whey (Schoko)", amount: "30 g", grams: 30 },
      { name: "Backpulver", amount: "½ TL" },
      { name: "Milch / Wasser", amount: "40 ml" },
      { name: "Ei oder Eiklar", amount: "1 Stück" },
    ],
    steps: [
      "Alles in einer Tasse verrühren.",
      "60–90 Sekunden mikrowellen.",
      "Kurz abkühlen lassen.",
    ],
  },
  {
    id: "yogurt-berries",
    name: "Joghurt mit Beeren",
    mealSlot: "SNACK",
    tags: ["high-protein", "low-calorie", "fat-loss", "quick"],
    prepMinutes: 3,
    calories: 160,
    proteinG: 20,
    carbsG: 14,
    fatG: 2,
    fiberG: 3,
    emoji: "🍓",
    accent: "from-rose-400/25 to-red-700/10",
    description: "Schneller Protein-Snack.",
    ingredients: [
      { name: "Skyr", amount: "150 g", grams: 150 },
      { name: "Beeren", amount: "80 g", grams: 80 },
    ],
    steps: ["Joghurt und Beeren vermengen.", "Sofort essen."],
  },
  {
    id: "protein-smoothie",
    name: "Protein-Smoothie",
    mealSlot: "SNACK",
    tags: ["high-protein", "quick", "muscle-gain"],
    prepMinutes: 5,
    calories: 250,
    proteinG: 30,
    carbsG: 22,
    fatG: 4,
    fiberG: 3,
    emoji: "🥤",
    accent: "from-cyan-400/30 to-blue-700/10",
    description: "Cremiger Shake als Snack oder Post-Workout.",
    ingredients: [
      { name: "Whey Protein", amount: "30 g", grams: 30 },
      { name: "Banane", amount: "½ Stück", grams: 50 },
      { name: "Milch 1,5 % / Haferdrink", amount: "250 ml" },
      { name: "Eiswürfel", amount: "3–4 Stück" },
    ],
    steps: ["Alles mixen.", "Sofort trinken."],
  },
  {
    id: "energy-bites",
    name: "Energy Bites",
    mealSlot: "SNACK",
    tags: ["quick", "muscle-gain"],
    prepMinutes: 15,
    calories: 180,
    proteinG: 12,
    carbsG: 16,
    fatG: 8,
    fiberG: 3,
    emoji: "🟤",
    accent: "from-amber-700/30 to-stone-800/10",
    description: "No-Bake Bites mit Hafer und Protein.",
    ingredients: [
      { name: "Haferflocken", amount: "40 g", grams: 40 },
      { name: "Proteinpulver", amount: "20 g", grams: 20 },
      { name: "Erdnussmus", amount: "20 g", grams: 20 },
      { name: "Honig", amount: "10 g", grams: 10 },
    ],
    steps: [
      "Alles kneten.",
      "Zu Kugeln formen.",
      "30 Minuten kalt stellen.",
    ],
  },
];

const byId = new Map(FITNESS_RECIPES.map((r) => [r.id, r]));

export function getFitnessRecipe(id: string): FitnessRecipe | undefined {
  return byId.get(id);
}

export function searchFitnessRecipes(
  query: string,
  filters: string[]
): FitnessRecipe[] {
  const q = query.trim().toLowerCase();
  return FITNESS_RECIPES.filter((r) => {
    if (q) {
      const hay = `${r.name} ${r.description} ${r.ingredients.map((i) => i.name).join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.length === 0) return true;
    return filters.every((f) => {
      if (f === "BREAKFAST" || f === "LUNCH" || f === "DINNER" || f === "SNACK") {
        return r.mealSlot === f;
      }
      return r.tags.includes(f as RecipeTag);
    });
  });
}

/** Total ingredient grams for logging as one food serving (= 1 portion). */
export function recipeServingGrams(recipe: FitnessRecipe): number {
  const sum = recipe.ingredients.reduce((s, i) => s + (i.grams ?? 0), 0);
  return sum > 0 ? sum : 100;
}

/** Per-100g macros for FoodItem import. */
export function recipeMacrosPer100g(recipe: FitnessRecipe) {
  const g = recipeServingGrams(recipe);
  const factor = 100 / g;
  return {
    calories: Math.round(recipe.calories * factor * 10) / 10,
    proteinG: Math.round(recipe.proteinG * factor * 10) / 10,
    carbsG: Math.round(recipe.carbsG * factor * 10) / 10,
    fatG: Math.round(recipe.fatG * factor * 10) / 10,
    fiberG: recipe.fiberG != null ? Math.round(recipe.fiberG * factor * 10) / 10 : null,
    servingG: g,
  };
}
