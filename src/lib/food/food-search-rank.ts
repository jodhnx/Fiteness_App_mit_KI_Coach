/**
 * Food search ranking — basic staples before composite dishes.
 * Pure helpers for unit tests (no DB).
 */

const COMPOSITE_MARKERS = [
  "sandwich",
  "wrap",
  "burger",
  "bowl",
  "salat",
  "salad",
  "pfanne",
  "curry",
  "pizza",
  "pasta",
  "suppe",
  "soup",
  "auflauf",
  "casserole",
  "risotto",
  "sushi",
  "roll",
  "torte",
  "kuchen",
  "cake",
  "muffin",
  "smoothie",
  "shake",
  "mit ",
  " with ",
  " und ",
  " & ",
  "/",
  "gericht",
  "meal",
  "teller",
  "platte",
  "menü",
  "menu",
  "toast",
  "bagel",
  "quesadilla",
  "taco",
  "burrito",
  "nudelgericht",
  "reisgericht",
  "chicken sandwich",
];

/** Extra composite phrases that should not win over staples. */
const COMPOSITE_PHRASES = [
  "sandwich mit",
  "wrap mit",
  "salat mit",
  "bowl mit",
  "curry mit",
  "mit reis",
  "with rice",
  "mit huhn",
  "mit hähnchen",
  "with chicken",
  "reispfanne",
  "reissalat",
  "chicken salad",
  "hähnchen salat",
  "hühnersalat",
];

const STAPLE_HINTS = [
  "hühnerbrust",
  "hähnchenbrust",
  "hühnerfleisch",
  "hähnchenfleisch",
  "chicken breast",
  "chicken",
  "huhn",
  "hähnchen",
  "rindfleisch",
  "schweinefleisch",
  "reis",
  "rice",
  "basmati",
  "jasminreis",
  "vollkornreis",
  "langkornreis",
  "haferflocken",
  "oats",
  "kartoffel",
  "kartoffeln",
  "ei",
  "eier",
  "milch",
  "joghurt",
  "quark",
  "topfen",
  "brot",
  "banane",
  "apfel",
  "tomate",
  "gurke",
  "brokkoli",
  "karotte",
  "nudeln",
  "pasta",
  "thunfisch",
  "lachs",
  "tofu",
];

export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isLikelyCompositeFood(name: string, brand?: string | null): boolean {
  const n = normalizeSearchText(`${name} ${brand ?? ""}`);
  if (COMPOSITE_PHRASES.some((p) => n.includes(normalizeSearchText(p)))) {
    return true;
  }
  // Multi-word with dish markers
  const words = n.split(" ").filter(Boolean);
  if (words.length >= 3) {
    if (
      COMPOSITE_MARKERS.some((m) => {
        const mm = normalizeSearchText(m);
        return n.includes(mm);
      })
    ) {
      return true;
    }
  }
  // "X mit Y" / "X with Y"
  if (/\bmit\b/.test(n) || /\bwith\b/.test(n)) return true;
  return false;
}

export function isLikelyStapleFood(name: string, brand?: string | null): boolean {
  if (isLikelyCompositeFood(name, brand)) return false;
  const n = normalizeSearchText(name);
  const brandN = normalizeSearchText(brand ?? "");
  if (brandN === "standardlebensmittel") return true;
  const words = n.split(" ").filter(Boolean);
  if (words.length <= 3 && STAPLE_HINTS.some((h) => n.includes(normalizeSearchText(h)))) {
    return true;
  }
  if (words.length <= 2 && n.length <= 28) return true;
  return STAPLE_HINTS.some((h) => n === normalizeSearchText(h));
}

export type RankableFood = {
  name: string;
  brand?: string | null;
  source?: string;
};

/**
 * Higher = better. Used to sort search results.
 */
export function scoreFoodSearchMatch(
  product: RankableFood,
  query: string
): number {
  const q = normalizeSearchText(query);
  if (!q) return 0;
  const name = normalizeSearchText(product.name);
  const brand = normalizeSearchText(product.brand ?? "");
  const hay = `${name} ${brand}`.trim();

  let score = 0;

  if (name === q) score += 200;
  else if (name.startsWith(q)) score += 140;
  else if (hay.startsWith(q)) score += 120;
  else if (name.includes(` ${q}`) || name.includes(q)) score += 70;
  else if (hay.includes(q)) score += 40;

  // Token coverage
  const qTokens = q.split(" ").filter((t) => t.length >= 2);
  for (const t of qTokens) {
    if (name.startsWith(t)) score += 18;
    else if (name.includes(t)) score += 10;
  }

  const staple = isLikelyStapleFood(product.name, product.brand);
  const composite = isLikelyCompositeFood(product.name, product.brand);

  if (staple) score += 90;
  if (composite) score -= 80;

  // Prefer catalog staples over restaurant brands for generic queries
  const brandL = brand;
  if (
    ["mcdonald", "burger king", "kfc", "subway", "domino", "pizza hut"].some(
      (b) => brandL.includes(b)
    )
  ) {
    score -= 40;
  }

  if (product.source === "local") score += 12;

  // Exact staple synonym boost for common queries
  if (
    (q.includes("huhn") ||
      q.includes("huhner") ||
      q.includes("hahnchen") ||
      q.includes("chicken")) &&
    staple &&
    (name.includes("brust") ||
      name.includes("fleisch") ||
      name.includes("chicken") ||
      name.includes("huhn") ||
      name.includes("hahnchen"))
  ) {
    score += 50;
  }
  if (
    (q === "reis" || q.startsWith("reis ") || q === "rice" || q.includes("rice")) &&
    (name === "reis" ||
      name.startsWith("reis ") ||
      name.includes("basmati") ||
      name.includes("jasmin") ||
      name.includes("langkorn") ||
      name.includes("vollkornreis") ||
      name === "rice" ||
      name.startsWith("rice "))
  ) {
    score += 80;
  }
  // Compound "reis…" dishes (Reispfanne) lose to whole-word rice staples
  if (
    (q === "reis" || q === "rice") &&
    (name.startsWith("reis") || name.includes("rice")) &&
    !name.startsWith("reis ") &&
    name !== "reis" &&
    !name.startsWith("rice ") &&
    name !== "rice" &&
    !name.includes("basmati") &&
    !name.includes("jasmin") &&
    !name.includes("langkorn") &&
    !name.includes("vollkorn")
  ) {
    score -= 70;
  }
  if (composite && (q === "reis" || q.includes("huhnerfleisch") || q.includes("huhn"))) {
    score -= 40;
  }

  return score;
}

export function rankFoodSearchResults<T extends RankableFood>(
  products: T[],
  query: string
): T[] {
  return [...products].sort(
    (a, b) => scoreFoodSearchMatch(b, query) - scoreFoodSearchMatch(a, query)
  );
}
