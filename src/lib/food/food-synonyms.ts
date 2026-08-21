/**
 * Regional food synonyms (AT ↔ DE) for search expansion.
 * Display names stay preferred by country; search matches both sides.
 */

import type { FoodCountryCode } from "@/lib/food/food-region";

/** Pairs: [Austrian term, German term] — both searchable. */
const AT_DE_PAIRS: [string, string][] = [
  ["topfen", "quark"],
  ["magertopfen", "magerquark"],
  ["faschiertes", "hackfleisch"],
  ["erdäpfel", "kartoffeln"],
  ["erdäpfel", "kartoffel"],
  ["obers", "sahne"],
  ["schlagobers", "schlagsahne"],
  ["paradeiser", "tomaten"],
  ["paradeiser", "tomate"],
  ["paprika", "paprika"],
  ["kren", "meerrettich"],
  ["fisolen", "grünen bohnen"],
  ["fisolen", "gruene bohnen"],
  ["marillen", "aprikosen"],
  ["marille", "aprikose"],
  ["schwammerl", "pilze"],
  ["eierschwammerl", "pfifferlinge"],
  ["karfiol", "blumenkohl"],
  ["kohlrabi", "kohlrabi"],
  ["rote rüben", "rote bete"],
  ["rote rübe", "rote bete"],
  ["semmel", "brötchen"],
  ["weckerl", "brötchen"],
  ["leberkäse", "leberkäse"],
  ["leberkäs", "fleischkäse"],
  ["powidl", "pflaumenmus"],
  ["ribes", "johannisbeeren"],
  ["heerdaepfel", "kartoffeln"],
];

const EXTRA_ALIASES: Record<string, string[]> = {
  cheeseburger: ["cheese burger", "käseburger", "kaeseburger"],
  hamburger: ["rindfleischburger"],
  "hackfleisch": ["faschiertes", "gehacktes"],
  faschiertes: ["hackfleisch", "gehacktes"],
  quark: ["topfen", "magertopfen", "magerquark"],
  topfen: ["quark", "magerquark", "magertopfen"],
  kartoffeln: ["erdäpfel", "kartoffel"],
  erdäpfel: ["kartoffeln", "kartoffel"],
  sahne: ["obers", "schlagobers"],
  obers: ["sahne", "schlagsahne"],
};

function unique(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of list) {
    const k = x.toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/** Expand a user query into synonym variants for OR-matching. */
export function expandFoodSearchTerms(
  query: string,
  _country: FoodCountryCode
): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [q];

  const terms = [q];

  for (const [at, de] of AT_DE_PAIRS) {
    if (q.includes(at) || q === at) {
      terms.push(q.replace(at, de), de);
    }
    if (q.includes(de) || q === de) {
      terms.push(q.replace(de, at), at);
    }
  }

  for (const [key, aliases] of Object.entries(EXTRA_ALIASES)) {
    if (q.includes(key) || q === key) {
      terms.push(...aliases);
    }
    for (const a of aliases) {
      if (q.includes(a) || q === a) {
        terms.push(key, ...aliases);
      }
    }
  }

  return unique(terms).slice(0, 8);
}

/** Preferred display label for a known staple in the user's country. */
export function localizeFoodLabel(
  country: FoodCountryCode,
  canonicalKey: string
): string {
  const map: Record<string, { AT: string; DE: string }> = {
    quark: { AT: "Topfen", DE: "Quark" },
    ground_beef: { AT: "Faschiertes", DE: "Hackfleisch" },
    potato: { AT: "Erdäpfel", DE: "Kartoffeln" },
    cream: { AT: "Obers", DE: "Sahne" },
    tomato: { AT: "Paradeiser", DE: "Tomaten" },
  };
  const entry = map[canonicalKey];
  if (!entry) return canonicalKey;
  return country === "AT" ? entry.AT : entry.DE;
}
