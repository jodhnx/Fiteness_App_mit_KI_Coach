import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { z } from "zod";
import {
  importOffProductByCode,
  upsertFoodFromProduct,
} from "@/lib/food/food-database-service";
import type { FoodProduct } from "@/lib/food/food-product-types";

const schema = z.object({
  offCode: z.string().min(8).optional(),
  product: z
    .object({
      offCode: z.string(),
      name: z.string(),
      brand: z.string().nullable().optional(),
      calories: z.number(),
      proteinG: z.number(),
      carbsG: z.number(),
      fatG: z.number(),
      fiberG: z.number().nullable().optional(),
      servingG: z.number(),
      imageUrl: z.string().nullable().optional(),
      barcode: z.string().nullable().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    if (parsed.data.product) {
      const p: FoodProduct = {
        ...parsed.data.product,
        brand: parsed.data.product.brand ?? null,
        fiberG: parsed.data.product.fiberG ?? null,
        source: "openfoodfacts",
      };
      const saved = await upsertFoodFromProduct(p);
      return jsonOk({ food: saved });
    }

    if (parsed.data.offCode) {
      const result = await importOffProductByCode(parsed.data.offCode);
      if (!result.product) return jsonError(result.error ?? "Import fehlgeschlagen", 404);
      return jsonOk({ food: result.product });
    }

    return jsonError("offCode oder product erforderlich");
  } catch (e) {
    return handleApiError(e);
  }
}
