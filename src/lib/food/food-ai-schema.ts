import { z } from "zod";

/** Strict AI vision food item — accepts common key aliases. */
const foodAiRawItemSchema = z
  .object({
    name: z.string().min(1).max(120),
    estimatedGrams: z.coerce.number().finite().positive().max(5000),
    calories: z.coerce.number().finite().min(0).max(10_000),
    protein: z.coerce.number().finite().min(0).max(1000).optional(),
    proteinG: z.coerce.number().finite().min(0).max(1000).optional(),
    carbs: z.coerce.number().finite().min(0).max(1000).optional(),
    carbsG: z.coerce.number().finite().min(0).max(1000).optional(),
    fat: z.coerce.number().finite().min(0).max(1000).optional(),
    fatG: z.coerce.number().finite().min(0).max(1000).optional(),
    confidence: z.coerce.number().finite().min(0).max(1).optional(),
    brand: z.string().max(80).optional().nullable(),
    description: z.string().max(200).optional().nullable(),
  })
  .transform((raw) => {
    const proteinG = Number(
      (raw.proteinG ?? raw.protein ?? 0).toFixed(1)
    );
    const carbsG = Number((raw.carbsG ?? raw.carbs ?? 0).toFixed(1));
    const fatG = Number((raw.fatG ?? raw.fat ?? 0).toFixed(1));
    const grams = Math.max(1, Math.round(raw.estimatedGrams));
    const calories = Math.max(0, Math.round(raw.calories));
    return {
      name: raw.name.trim().slice(0, 80),
      estimatedGrams: grams,
      calories,
      proteinG,
      carbsG,
      fatG,
      confidence:
        raw.confidence == null
          ? null
          : Math.min(1, Math.max(0, Number(raw.confidence))),
      brand: raw.brand?.trim() || null,
      description: raw.description?.trim() || null,
    };
  });

export const foodAiResponseSchema = z
  .object({
    foods: z.array(foodAiRawItemSchema).max(8).optional(),
    items: z.array(foodAiRawItemSchema).max(8).optional(),
  })
  .transform((raw) => {
    const list = (raw.foods?.length ? raw.foods : raw.items) ?? [];
    return { foods: list.slice(0, 8) };
  });

export type FoodAiParsedFood = z.infer<typeof foodAiRawItemSchema>;

export const FOOD_AI_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const FOOD_AI_MAX_BYTES = 10 * 1024 * 1024;
export const FOOD_AI_CLIENT_MAX_BYTES = 12 * 1024 * 1024;

export type FoodAIItem = {
  id: string;
  name: string;
  estimatedGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: number | null;
  brand: string | null;
  /** Macros originally returned for estimatedGrams — used for rescaling */
  baseGrams: number;
  baseCalories: number;
  baseProteinG: number;
  baseCarbsG: number;
  baseFatG: number;
};

export type FoodAIErrorCode =
  | "missing_key"
  | "openai_error"
  | "provider"
  | "network"
  | "timeout"
  | "rate_limit"
  | "parse_error"
  | "empty"
  | "invalid_image"
  | "unauthorized"
  | "server_error";

export type FoodAIResult = {
  items: FoodAIItem[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  disclaimer: string;
  errorCode?: FoodAIErrorCode;
};

export function foodAiItemsFromParsed(
  foods: FoodAiParsedFood[],
  idPrefix = "ai"
): FoodAIItem[] {
  const stamp = Date.now();
  return foods.map((it, i) => ({
    id: `${idPrefix}-${i}-${stamp}`,
    name: it.name,
    estimatedGrams: it.estimatedGrams,
    calories: it.calories,
    proteinG: it.proteinG,
    carbsG: it.carbsG,
    fatG: it.fatG,
    confidence: it.confidence,
    brand: it.brand,
    baseGrams: it.estimatedGrams,
    baseCalories: it.calories,
    baseProteinG: it.proteinG,
    baseCarbsG: it.carbsG,
    baseFatG: it.fatG,
  }));
}

export function foodAiTotals(items: Pick<FoodAIItem, "calories" | "proteinG" | "carbsG" | "fatG">[]) {
  return items.reduce(
    (acc, it) => ({
      calories: acc.calories + it.calories,
      proteinG: acc.proteinG + it.proteinG,
      carbsG: acc.carbsG + it.carbsG,
      fatG: acc.fatG + it.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
}
