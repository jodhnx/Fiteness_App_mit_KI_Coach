export type FoodProductSource = "local" | "openfoodfacts";

export type ExtendedNutrientsPer100g = {
  sugarG?: number | null;
  fiberG?: number | null;
  saltG?: number | null;
  saturatedFatG?: number | null;
  unsaturatedFatG?: number | null;
  potassiumMg?: number | null;
  magnesiumMg?: number | null;
  calciumMg?: number | null;
};

export type FoodProduct = {
  id?: string;
  offCode?: string;
  barcode?: string | null;
  name: string;
  brand: string | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  /** Per 100g — sugars, salt, minerals (when available) */
  extended?: ExtendedNutrientsPer100g | null;
  servingG: number;
  servingLabel?: string | null;
  imageUrl?: string | null;
  category?: string;
  source: FoodProductSource;
  countries?: string[];
  austriaScore?: number;
};

export type FoodSearchResponse = {
  products: FoodProduct[];
  suggestions: string[];
  query: string;
  source: "merged" | "local" | "openfoodfacts";
  offAvailable: boolean;
  offError?: string | null;
  localCount?: number;
  offCount?: number;
  offSource?: string | null;
  localError?: string | null;
};
