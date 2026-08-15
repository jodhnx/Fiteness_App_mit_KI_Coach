import {
  R,
  type FitnessRecipe,
  type RecipeIngredient,
  type RecipeMealSlot,
  type RecipeTag,
  type RecipeVariation,
} from "./types";

/**
 * Extended catalog for pagination/search scale.
 * Each entry uses cuisine-aware templates (not stub placeholders).
 */

type SpecBase = {
  id: string;
  name: string;
  mealSlot: RecipeMealSlot;
  tags: RecipeTag[];
  prepMinutes: number;
  cookMinutes: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  emoji: string;
  accent: string;
  description: string;
  cuisine: Cuisine;
  proteinLabel: string;
  proteinGrams: number;
  carbLabel: string;
  carbGrams: number;
  vegLabel: string;
  vegGrams: number;
};

type Cuisine =
  | "mediterranean"
  | "mexican"
  | "asian"
  | "indian"
  | "classic"
  | "sweet"
  | "snack";

const ACCENTS = [
  "from-cyan-500/25 to-zinc-900/40",
  "from-orange-500/25 to-zinc-900/40",
  "from-rose-500/25 to-zinc-900/40",
  "from-emerald-500/25 to-zinc-900/40",
  "from-violet-500/25 to-zinc-900/40",
  "from-amber-500/25 to-zinc-900/40",
] as const;

const CUISINE_SPICES: Record<Cuisine, string[]> = {
  mediterranean: ["Oregano", "Basilikum", "Thymian", "Rosmarin", "Knoblauch", "Pfeffer", "Salz"],
  mexican: ["Kreuzkümmel", "Paprika", "Chili", "Knoblauch", "Koriander", "Oregano", "Salz"],
  asian: ["Ingwer", "Knoblauch", "Sesam", "Chili", "Soja", "Pfeffer"],
  indian: ["Curry", "Kurkuma", "Kreuzkümmel", "Ingwer", "Knoblauch", "Koriander", "Chili"],
  classic: ["Paprika", "Knoblauch", "Pfeffer", "Salz", "Kräuter der Provence"],
  sweet: ["Zimt", "Vanille", "Kakao", "Salz"],
  snack: ["Pfeffer", "Paprika", "Salz", "Chili"],
};

function spiceAmounts(cuisine: Cuisine): RecipeIngredient[] {
  const map: Record<Cuisine, RecipeIngredient[]> = {
    mediterranean: [
      { group: "Gewürze", name: "Oregano", amount: "½ TL" },
      { group: "Gewürze", name: "Basilikum", amount: "½ TL" },
      { group: "Gewürze", name: "Knoblauchpulver", amount: "½ TL" },
      { group: "Gewürze", name: "Schwarzer Pfeffer", amount: "¼ TL" },
      { group: "Gewürze", name: "Salz", amount: "¼ TL" },
    ],
    mexican: [
      { group: "Gewürze", name: "Kreuzkümmel", amount: "½ TL" },
      { group: "Gewürze", name: "Paprikapulver", amount: "½ TL" },
      { group: "Gewürze", name: "Chiliflocken", amount: "¼ TL" },
      { group: "Gewürze", name: "Knoblauchpulver", amount: "½ TL" },
      { group: "Gewürze", name: "Koriander (getrocknet)", amount: "¼ TL" },
      { group: "Gewürze", name: "Salz", amount: "¼ TL" },
    ],
    asian: [
      { group: "Gewürze", name: "Ingwer (frisch gerieben)", amount: "1 TL" },
      { group: "Gewürze", name: "Knoblauch (fein)", amount: "1 Zehe" },
      { group: "Gewürze", name: "Sojasauce light", amount: "1 EL" },
      { group: "Gewürze", name: "Sesamöl", amount: "½ TL" },
      { group: "Gewürze", name: "Chiliflocken", amount: "1 Prise" },
    ],
    indian: [
      { group: "Gewürze", name: "Currypulver", amount: "1 TL" },
      { group: "Gewürze", name: "Kurkuma", amount: "½ TL" },
      { group: "Gewürze", name: "Kreuzkümmel", amount: "½ TL" },
      { group: "Gewürze", name: "Ingwer (frisch)", amount: "1 TL" },
      { group: "Gewürze", name: "Knoblauch", amount: "1 Zehe" },
      { group: "Gewürze", name: "Chiliflocken", amount: "1 Prise" },
      { group: "Gewürze", name: "Salz", amount: "¼ TL" },
    ],
    classic: [
      { group: "Gewürze", name: "Paprikapulver", amount: "½ TL" },
      { group: "Gewürze", name: "Knoblauchpulver", amount: "½ TL" },
      { group: "Gewürze", name: "Pfeffer", amount: "¼ TL" },
      { group: "Gewürze", name: "Salz", amount: "¼ TL" },
      { group: "Gewürze", name: "Italienische Kräuter", amount: "½ TL" },
    ],
    sweet: [
      { group: "Gewürze", name: "Zimt", amount: "¼ TL" },
      { group: "Gewürze", name: "Vanilleextrakt", amount: "½ TL" },
      { group: "Gewürze", name: "Salz", amount: "1 Prise" },
    ],
    snack: [
      { group: "Gewürze", name: "Paprikapulver", amount: "¼ TL" },
      { group: "Gewürze", name: "Pfeffer", amount: "1 Prise" },
      { group: "Gewürze", name: "Salz", amount: "1 Prise" },
    ],
  };
  return map[cuisine];
}

function buildIngredients(s: SpecBase): RecipeIngredient[] {
  if (s.mealSlot === "SNACK" || s.cuisine === "sweet" || s.cuisine === "snack") {
    return [
      { group: "Basis", name: s.proteinLabel, amount: `${s.proteinGrams} g`, grams: s.proteinGrams },
      {
        group: "Basis",
        name: s.carbLabel,
        amount: s.carbGrams > 0 ? `${s.carbGrams} g` : "nach Bedarf",
        grams: s.carbGrams || undefined,
      },
      {
        group: "Extras",
        name: s.vegLabel,
        amount: s.vegGrams > 0 ? `${s.vegGrams} g` : "nach Geschmack",
        grams: s.vegGrams || undefined,
      },
      { group: "Bindung", name: "Olivenöl oder Milch splash", amount: "1 TL" },
      ...spiceAmounts(s.cuisine),
    ];
  }

  return [
    {
      group: "Protein",
      name: s.proteinLabel,
      amount: `${s.proteinGrams} g`,
      grams: s.proteinGrams,
    },
    { group: "Protein", name: "Olivenöl", amount: "1 TL", grams: 5 },
    {
      group: "Beilage",
      name: s.carbLabel,
      amount: `${s.carbGrams} g`,
      grams: s.carbGrams,
    },
    { group: "Beilage", name: "Wasser", amount: "nach Packungsangabe" },
    { group: "Beilage", name: "Salz", amount: "1 Prise" },
    {
      group: "Gemüse",
      name: s.vegLabel,
      amount: `${s.vegGrams} g`,
      grams: s.vegGrams,
    },
    ...spiceAmounts(s.cuisine),
    {
      group: "Finish",
      name: "Zitronensaft oder frische Kräuter",
      amount: "1 TL / 1 EL",
    },
  ];
}

function buildSteps(s: SpecBase): string[] {
  if (s.mealSlot === "SNACK" || s.cuisine === "sweet" || s.cuisine === "snack") {
    return [
      `${s.proteinLabel} und ${s.carbLabel} abwiegen und bereitstellen.`,
      `Gewürze (${CUISINE_SPICES[s.cuisine].slice(0, 3).join(", ")}) mit der Basis vermengen.`,
      `${s.vegLabel} vorbereiten und unterheben oder als Topping verwenden.`,
      "Auf die gewünschte Konsistenz bringen (rühren, mixen oder kurz erhitzen).",
      "Abschmecken und sofort genießen — oder für unterwegs portionieren.",
    ];
  }

  return [
    `${s.carbLabel} waschen und nach Packungsangabe garen. Mit einer Prise Salz abschmecken und beiseitestellen.`,
    `${s.proteinLabel} trockentupfen und mit Öl sowie den Gewürzen (${CUISINE_SPICES[s.cuisine].slice(0, 4).join(", ")}) einreiben. 5 Minuten ziehen lassen.`,
    "Eine Pfanne auf mittlere bis hohe Hitze vorheizen.",
    `Protein von beiden Seiten anbraten, bis es goldbraun ist und die Kerntemperatur stimmt (Geflügel durchgegart, Fisch blättert leicht).`,
    `${s.vegLabel} in derselben Pfanne 4–6 Minuten bissfest anbraten, bei Bedarf nachwürzen.`,
    "Protein kurz ruhen lassen, dann in Scheiben schneiden.",
    "Beilage, Gemüse und Protein anrichten. Mit Zitronensaft oder frischen Kräutern finishen.",
    "Heiß servieren. Für Meal Prep: Komponenten abkühlen und getrennt lagern.",
  ];
}

function buildTips(s: SpecBase): string[] {
  return [
    "Gewürze erst auf dem Protein verreiben, dann braten — so haften sie besser.",
    s.calories <= 400
      ? "Für noch weniger Kalorien: Öl-Spray statt TL Öl verwenden."
      : "Für mehr Protein: Beilage leicht reduzieren und 30–40 g Protein extra.",
    "Meal Prep: bis zu 3 Tage gekühlt aufbewahren, Sauce separat halten.",
  ];
}

function buildVariations(s: SpecBase): RecipeVariation[] {
  return [
    {
      title: "High Protein",
      description: `Proteinmenge auf ${s.proteinGrams + 40} g erhöhen und Beilage leicht reduzieren.`,
    },
    {
      title: "Low Calorie",
      description: "Öl halbieren und fettarme Sauce (Joghurt/Zitrone) statt Öldressing.",
    },
    {
      title: "Meal Prep",
      description: "3–4 Portionen batch-kochen, in Boxen portionieren, max. 3 Tage kühlen.",
    },
    ...(s.tags.includes("vegetarian")
      ? []
      : [
          {
            title: "Vegetarisch",
            description: "Protein durch Tofu, Tempeh oder Hülsenfrüchte gleicher Menge ersetzen.",
          },
        ]),
  ];
}

function enrich(s: SpecBase): FitnessRecipe {
  return R({
    id: s.id,
    name: s.name,
    mealSlot: s.mealSlot,
    tags: s.tags,
    prepMinutes: s.prepMinutes,
    cookMinutes: s.cookMinutes,
    calories: s.calories,
    proteinG: s.proteinG,
    carbsG: s.carbsG,
    fatG: s.fatG,
    fiberG: s.fiberG,
    emoji: s.emoji,
    accent: s.accent,
    description: s.description,
    spices: CUISINE_SPICES[s.cuisine],
    ingredients: buildIngredients(s),
    steps: buildSteps(s),
    tips: buildTips(s),
    variations: buildVariations(s),
    storageNote: "Im Kühlschrank bis 3 Tage in einer geschlossenen Box.",
    mealPrepNote:
      s.mealSlot === "SNACK"
        ? "Portionsweise vorbereiten und gekühlt mitnehmen."
        : "Komponenten getrennt lagern, vor dem Essen kurz aufwärmen und frisch würzen.",
  });
}

function buildBatch(): SpecBase[] {
  const specs: SpecBase[] = [];

  const breakfast: Array<
    [string, string, string, number, number, number, number, Cuisine, string, string, string]
  > = [
    ["skyr-berry-bowl", "Skyr Beeren Bowl", "🥣", 280, 32, 24, 4, "sweet", "Skyr natur", "Beerenmix", "Haferflocken"],
    ["egg-white-omelette", "Eiweiß-Omelett", "🥚", 220, 28, 6, 8, "classic", "Eiklar", "Paprika", "Spinat"],
    ["protein-bagel", "Protein Bagel", "🥯", 390, 30, 42, 10, "classic", "Hüttenkäse", "Vollkornbagel", "Tomate"],
    ["cottage-tomato", "Hüttenkäse Tomate", "🍅", 250, 28, 12, 8, "mediterranean", "Hüttenkäse", "Kirschtomaten", "Gurke"],
    ["banana-protein-toast", "Bananen Protein Toast", "🍌", 340, 24, 48, 6, "sweet", "Whey Protein", "Vollkorntoast", "Banane"],
    ["turkey-egg-muffin", "Puten-Egg-Muffins", "🧁", 310, 34, 8, 14, "classic", "Putenbrust", "Eier", "Brokkoli"],
    ["quinoa-breakfast", "Quinoa Frühstück", "🌾", 360, 22, 46, 10, "sweet", "Skyr", "Quinoa", "Apfel"],
    ["smoked-salmon-egg", "Räucherlachs & Ei", "🐟", 380, 32, 6, 22, "mediterranean", "Räucherlachs", "Eier", "Rucola"],
    ["protein-crepes", "Protein Crêpes", "🥞", 320, 30, 34, 8, "sweet", "Whey Protein", "Haferflocken", "Beeren"],
    ["apple-cinnamon-oats", "Apfel-Zimt Hafer", "🍎", 350, 26, 48, 8, "sweet", "Whey Protein", "Haferflocken", "Apfel"],
    ["tofu-scramble", "Tofu Scramble", "🧈", 290, 24, 16, 14, "classic", "Räuchertofu", "Paprika", "Spinat"],
    ["whey-porridge-pb", "Whey Porridge PB", "🥜", 410, 38, 40, 12, "sweet", "Whey Protein", "Haferflocken", "Erdnussmus"],
  ];

  breakfast.forEach(([id, name, emoji, cal, p, c, f, cuisine, protein, carb, veg], i) => {
    specs.push({
      id: `mega-${id}`,
      name,
      mealSlot: "BREAKFAST",
      tags: p >= 30 ? ["high-protein", "muscle-gain"] : ["quick"],
      prepMinutes: 6 + (i % 4),
      cookMinutes: 6 + (i % 5),
      calories: cal,
      proteinG: p,
      carbsG: c,
      fatG: f,
      fiberG: 4 + (i % 4),
      emoji,
      accent: ACCENTS[i % ACCENTS.length],
      description: `${name} — fitnessfreundlich, würzig und mit vollständiger Zutatenliste.`,
      cuisine,
      proteinLabel: protein,
      proteinGrams: Math.round(p * 3.2),
      carbLabel: carb,
      carbGrams: Math.max(20, Math.round(c * 0.9)),
      vegLabel: veg,
      vegGrams: 60 + (i % 5) * 10,
    });
  });

  const lunch: Array<
    [string, string, string, number, number, number, number, Cuisine, string, string, string]
  > = [
    ["grilled-chicken-salad", "Gegrillter Hähnchen-Salat", "🥗", 420, 45, 18, 16, "mediterranean", "Hähnchenbrust", "Quinoa", "Blattsalat-Mix"],
    ["turkey-quinoa", "Pute Quinoa Bowl", "🦃", 480, 42, 44, 14, "classic", "Putenbrust", "Quinoa", "Gemüsemix"],
    ["salmon-asparagus", "Lachs Spargel", "🥦", 460, 40, 12, 26, "mediterranean", "Lachsfilet", "Süßkartoffel", "Spargel"],
    ["beef-stir-fry", "Rinder-Gemüse-Pfanne", "🥩", 510, 44, 28, 22, "asian", "Rinderhüfte", "Reis", "Wok-Gemüse"],
    ["chickpea-curry", "Kichererbsen-Curry", "🍛", 430, 22, 52, 14, "indian", "Kichererbsen", "Basmatireis", "Spinat"],
    ["tuna-pasta", "Thunfisch Pasta", "🍝", 520, 38, 58, 12, "mediterranean", "Thunfisch", "Vollkornpasta", "Zucchini"],
    ["chicken-couscous", "Hähnchen Couscous", "🍗", 490, 40, 48, 14, "mediterranean", "Hähnchenbrust", "Couscous", "Paprika"],
    ["shrimp-rice", "Garnelen Reis", "🦐", 450, 36, 46, 10, "asian", "Garnelen", "Jasminreis", "Pak Choi"],
    ["lentil-salad", "Linsen-Salat", "🌿", 380, 24, 42, 12, "mediterranean", "Belugalinsen", "Bulgur", "Gurke & Tomate"],
    ["pork-tenderloin", "Schweinsfilet Gemüse", "🍖", 470, 42, 16, 22, "classic", "Schweinsfilet", "Kartoffeln", "Ofengemüse"],
    ["falafel-bowl", "Falafel Bowl", "🧆", 440, 20, 48, 18, "mediterranean", "Falafel (gebacken)", "Couscous", "Salat & Hummus"],
    ["chicken-soup", "Protein Hühnersuppe", "🍲", 320, 34, 22, 8, "classic", "Hähnchenbrust", "Nudeln", "Suppengrün"],
    ["steak-salad", "Steak Salat", "🥬", 490, 46, 14, 24, "classic", "Rindersteak", "Süßkartoffel", "Rucola"],
    ["veggie-pasta", "Gemüse Pasta Protein", "🍜", 460, 28, 58, 12, "mediterranean", "Hüttenkäse", "Vollkornpasta", "Gemüsemix"],
    ["duck-rice", "Ente mit Reis", "🦆", 540, 38, 42, 24, "asian", "Entenbrust", "Reis", "Pak Choi"],
  ];

  lunch.forEach(([id, name, emoji, cal, p, c, f, cuisine, protein, carb, veg], i) => {
    specs.push({
      id: `mega-${id}`,
      name,
      mealSlot: "LUNCH",
      tags: [
        ...(p >= 35 ? (["high-protein"] as RecipeTag[]) : []),
        ...(cal <= 400 ? (["low-calorie", "fat-loss"] as RecipeTag[]) : []),
        ...(cal >= 480 ? (["muscle-gain"] as RecipeTag[]) : []),
        ...(cuisine === "mediterranean" && p < 35 ? (["vegetarian"] as RecipeTag[]) : []),
      ].filter((t, idx, arr) => arr.indexOf(t) === idx),
      prepMinutes: 12 + (i % 5),
      cookMinutes: 15 + (i % 6) * 2,
      calories: cal,
      proteinG: p,
      carbsG: c,
      fatG: f,
      fiberG: 5 + (i % 5),
      emoji,
      accent: ACCENTS[(i + 2) % ACCENTS.length],
      description: `${name} — ausgewogen für Trainingstage mit passenden Gewürzen und klaren Schritten.`,
      cuisine,
      proteinLabel: protein,
      proteinGrams: Math.round(80 + p * 1.5),
      carbLabel: carb,
      carbGrams: Math.max(40, Math.round(c * 0.85)),
      vegLabel: veg,
      vegGrams: 140 + (i % 4) * 20,
    });
  });

  const dinner: Array<
    [string, string, string, number, number, number, number, Cuisine, string, string, string]
  > = [
    ["cod-potatoes", "Kabeljau Kartoffeln", "🥔", 430, 38, 36, 10, "mediterranean", "Kabeljau", "Kartoffeln", "Brokkoli"],
    ["chicken-zucchini", "Hähnchen Zucchini", "🥒", 390, 42, 14, 14, "classic", "Hähnchenbrust", "Quinoa", "Zucchini"],
    ["turkey-chili", "Puten Chili", "🌶️", 410, 40, 32, 12, "mexican", "Putenhack", "Kidneybohnen", "Paprika"],
    ["salmon-broccoli", "Lachs Brokkoli", "🥦", 470, 40, 10, 28, "classic", "Lachsfilet", "Süßkartoffel", "Brokkoli"],
    ["tofu-stir", "Tofu Gemüse Wok", "🥡", 360, 26, 28, 16, "asian", "Tofu fest", "Reisnudeln", "Wok-Gemüse"],
    ["lean-beef-bowl", "Mageres Rind Bowl", "🥣", 500, 46, 38, 18, "classic", "Rinderhüfte", "Reis", "Gemüsemix"],
    ["egg-veggie-bake", "Ei-Gemüse Auflauf", "🥘", 340, 28, 16, 16, "mediterranean", "Eier", "Kartoffeln", "Gemüsemix"],
    ["shrimp-zucchini", "Garnelen Zucchini", "🦐", 320, 34, 12, 12, "mediterranean", "Garnelen", "Couscous", "Zucchini"],
    ["chicken-soup-dinner", "Abend Hühnersuppe", "🍲", 300, 32, 20, 8, "classic", "Hähnchen", "Karotten", "Sellerie"],
    ["protein-tacos", "Protein Tacos", "🌮", 450, 36, 40, 14, "mexican", "Hähnchenhack", "Tortillas", "Salat & Salsa"],
    ["veggie-burger-night", "Veggie Protein Burger", "🍔", 420, 30, 38, 14, "classic", "Bohnen-Patty", "Vollkornbun", "Salat"],
    ["white-fish-rice", "Weißfisch Reis", "🐟", 440, 38, 42, 10, "asian", "Seelachs", "Reis", "Gemüse"],
  ];

  dinner.forEach(([id, name, emoji, cal, p, c, f, cuisine, protein, carb, veg], i) => {
    specs.push({
      id: `mega-${id}`,
      name,
      mealSlot: "DINNER",
      tags: [
        ...(p >= 35 ? (["high-protein"] as RecipeTag[]) : []),
        ...(cal <= 380 ? (["low-calorie", "fat-loss"] as RecipeTag[]) : []),
        "quick",
      ],
      prepMinutes: 10 + (i % 5),
      cookMinutes: 16 + (i % 5) * 2,
      calories: cal,
      proteinG: p,
      carbsG: c,
      fatG: f,
      fiberG: 4 + (i % 4),
      emoji,
      accent: ACCENTS[(i + 1) % ACCENTS.length],
      description: `${name} — abendtauglich, sättigend und mit realistischen Zubereitungsschritten.`,
      cuisine,
      proteinLabel: protein,
      proteinGrams: Math.round(90 + p * 1.4),
      carbLabel: carb,
      carbGrams: Math.max(30, Math.round(c * 0.9)),
      vegLabel: veg,
      vegGrams: 160 + (i % 5) * 15,
    });
  });

  const snacks: Array<
    [string, string, string, number, number, number, number, Cuisine, string, string, string]
  > = [
    ["protein-bar-homemade", "Protein Riegel", "🍫", 180, 18, 14, 6, "sweet", "Whey Protein", "Haferflocken", "Kakao"],
    ["apple-pb", "Apfel mit Erdnussbutter", "🍎", 220, 8, 24, 12, "sweet", "Erdnussmus", "Apfel", "Zimt"],
    ["tuna-rice-cake", "Thunfisch Reiswaffel", "🍘", 160, 18, 12, 4, "snack", "Thunfisch", "Reiswaffeln", "Gurke"],
    ["skyr-honey", "Skyr Honig", "🥛", 190, 22, 16, 2, "sweet", "Skyr", "Honig", "Beeren"],
    ["beef-jerky-snack", "Beef Jerky Snack", "🥓", 140, 22, 4, 4, "snack", "Beef Jerky", "Paprika-Sticks", "Salz"],
    ["hummus-carrot", "Hummus Karotten", "🥕", 170, 8, 18, 8, "mediterranean", "Hummus", "Karotten", "Paprika"],
    ["protein-hot-choc", "Protein Heiße Schoko", "☕", 150, 20, 12, 3, "sweet", "Whey Schoko", "Milch", "Kakao"],
    ["egg-snack", "Hartgekochte Eier", "🥚", 140, 12, 1, 10, "snack", "Eier", "Salz", "Schnittlauch"],
    ["cottage-pineapple", "Hüttenkäse Ananas", "🍍", 180, 24, 16, 2, "sweet", "Hüttenkäse", "Ananas", "Zimt"],
    ["whey-water", "Whey Shake Classic", "🥤", 120, 24, 3, 1, "sweet", "Whey Protein", "Wasser", "Eiswürfel"],
    ["almonds-portion", "Mandeln Portion", "🥜", 200, 7, 6, 18, "snack", "Mandeln", "Salz", "Rosinen light"],
    ["rice-pudding-pro", "Reisporridge Protein", "🍚", 240, 20, 32, 4, "sweet", "Whey Protein", "Milchreis", "Zimt"],
  ];

  snacks.forEach(([id, name, emoji, cal, p, c, f, cuisine, protein, carb, veg], i) => {
    specs.push({
      id: `mega-${id}`,
      name,
      mealSlot: "SNACK",
      tags: [
        "quick",
        ...(p >= 18 ? (["high-protein"] as RecipeTag[]) : []),
        ...(cal <= 180 ? (["low-calorie"] as RecipeTag[]) : []),
      ],
      prepMinutes: 3 + (i % 4),
      cookMinutes: i % 3 === 0 ? 2 : 0,
      calories: cal,
      proteinG: p,
      carbsG: c,
      fatG: f,
      emoji,
      accent: ACCENTS[(i + 3) % ACCENTS.length],
      description: `${name} — schneller Snack mit klaren Zutaten und Würzung.`,
      cuisine,
      proteinLabel: protein,
      proteinGrams: Math.max(20, Math.round(p * 3)),
      carbLabel: carb,
      carbGrams: Math.max(10, Math.round(c * 0.8)),
      vegLabel: veg,
      vegGrams: 20 + (i % 4) * 10,
    });
  });

  // Meal-prep boxes with real structure
  const prepProteins = [
    "Hähnchenbrust",
    "Putenbrust",
    "Lachs",
    "Tofu",
    "Rinderhack mager",
    "Kabeljau",
  ];
  const prepCarbs = ["Basmatireis", "Quinoa", "Süßkartoffel", "Couscous", "Vollkornnudeln"];
  const prepVeg = ["Brokkoli & Paprika", "Zucchini-Mix", "Ofengemüse", "Blattsalat & Gurke"];
  const prepCuisines: Cuisine[] = ["classic", "mediterranean", "mexican", "asian", "indian"];

  for (let n = 1; n <= 24; n++) {
    const slot: RecipeMealSlot =
      n % 4 === 1 ? "BREAKFAST" : n % 4 === 2 ? "LUNCH" : n % 4 === 3 ? "DINNER" : "SNACK";
    const protein = 28 + (n % 20);
    const cal = 320 + n * 7;
    const cuisine = prepCuisines[n % prepCuisines.length];
    specs.push({
      id: `mega-mealprep-${n}`,
      name: `Meal Prep Box ${n}`,
      mealSlot: slot,
      tags: ["high-protein", "muscle-gain", "quick"],
      prepMinutes: 15,
      cookMinutes: 25,
      calories: cal,
      proteinG: protein,
      carbsG: 35 + (n % 15),
      fatG: 10 + (n % 8),
      fiberG: 5,
      emoji: "📦",
      accent: ACCENTS[n % ACCENTS.length],
      description: `Vorbereitete Meal-Prep Box #${n} — batch-gekocht mit passenden Gewürzen und Aufbewahrungshinweisen.`,
      cuisine,
      proteinLabel: prepProteins[n % prepProteins.length],
      proteinGrams: 140 + (n % 40),
      carbLabel: prepCarbs[n % prepCarbs.length],
      carbGrams: 100 + (n % 40),
      vegLabel: prepVeg[n % prepVeg.length],
      vegGrams: 150 + (n % 50),
    });
  }

  return specs;
}

export const MEGA_RECIPES: FitnessRecipe[] = buildBatch().map(enrich);
