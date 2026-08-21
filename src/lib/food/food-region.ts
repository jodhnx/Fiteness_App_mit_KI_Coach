/**
 * Food Database V2 — regional country helpers (AT / DE).
 */

export type FoodCountryCode = "AT" | "DE";

export const FOOD_COUNTRY_OPTIONS: {
  code: FoodCountryCode;
  label: string;
  flag: string;
}[] = [
  { code: "AT", label: "Österreich", flag: "🇦🇹" },
  { code: "DE", label: "Deutschland", flag: "🇩🇪" },
];

export function normalizeFoodCountry(raw: unknown): FoodCountryCode {
  const v = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (v === "DE" || v === "GERMANY" || v === "DEUTSCHLAND") return "DE";
  return "AT";
}

/** Retailers prioritized per country (for UI hints + ranking). */
export const RETAILERS_BY_COUNTRY: Record<FoodCountryCode, string[]> = {
  AT: [
    "BILLA",
    "BILLA PLUS",
    "SPAR",
    "INTERSPAR",
    "HOFER",
    "Lidl",
    "Penny",
    "ADEG",
    "MPreis",
    "dm",
    "BIPA",
  ],
  DE: [
    "REWE",
    "EDEKA",
    "ALDI",
    "Lidl",
    "Penny",
    "Netto",
    "Kaufland",
    "dm",
  ],
};

export function preferredProductName(
  country: FoodCountryCode,
  names: { at?: string; de?: string; fallback: string }
): string {
  if (country === "AT") return names.at ?? names.de ?? names.fallback;
  return names.de ?? names.at ?? names.fallback;
}
