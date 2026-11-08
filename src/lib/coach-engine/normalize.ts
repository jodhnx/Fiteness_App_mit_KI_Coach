/** Normalize user messages for intent matching (DE/EN, typos, umlauts). */

export function normalizeCoachMessage(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}\s?/.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Light typo / synonym folding for common fitness terms. */
export function expandCoachSynonyms(normalized: string): string {
  let t = normalized;
  const pairs: [RegExp, string][] = [
    [/\bproteine?\b/g, "protein"],
    [/\beiweiss\b/g, "protein"],
    [/\bwhey\b/g, "protein"],
    [/\bkcal\b/g, "kalorien"],
    [/\bcalories?\b/g, "kalorien"],
    [/\bcarbs?\b/g, "kohlenhydrate"],
    [/\bkh\b/g, "kohlenhydrate"],
    [/\bfats?\b/g, "fett"],
    [/\bdeficit\b/g, "defizit"],
    [/\bsurplus\b/g, "ueberschuss"],
    [/\bbulk(en|ing)?\b/g, "aufbau"],
    [/\bcut(ten|ting)?\b/g, "abnehmen"],
    [/\bdeload(ing)?\b/g, "deload"],
    [/\breps?\b/g, "wiederholungen"],
    [/\bsets?\b/g, "saetze"],
    [/\bppl\b/g, "push pull legs"],
    [/\bul\b/g, "upper lower"],
    [/\bsoreness\b/g, "muskelkater"],
    [/\brecovery\b/g, "regeneration"],
    [/\bsleep\b/g, "schlaf"],
    [/\bcreatine\b/g, "creatin"],
    [/\bsupplement(s|e)?\b/g, "supplements"],
  ];
  for (const [re, rep] of pairs) t = t.replace(re, rep);
  return t;
}

export function prepareCoachText(raw: string): string {
  return expandCoachSynonyms(normalizeCoachMessage(raw));
}
