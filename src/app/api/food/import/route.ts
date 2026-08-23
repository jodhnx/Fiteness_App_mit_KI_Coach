import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { z } from "zod";
import {
  importOffProductByCode,
  upsertFoodFromProduct,
} from "@/lib/food/food-database-service";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { rateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  offCode: z.string().min(8).optional(),
  product: z
    .object({
      offCode: z.string().optional(),
      name: z.string().min(1),
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

    const limit = rateLimit(`food-import:${session.user.id}`, 30, 3600_000);
    if (!limit.success) return jsonError("Zu viele Imports", 429);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    // Prefer verified Open Food Facts codes — shared catalog only from OFF
    if (parsed.data.offCode) {
      const result = await importOffProductByCode(
        parsed.data.offCode,
        session.user.id
      );
      if (!result.product) return jsonError(result.error ?? "Import fehlgeschlagen", 404);
      return jsonOk({ food: result.product });
    }

    if (parsed.data.product) {
      const p = parsed.data.product;
      // Manual products without OFF code are user-scoped (not global catalog)
      if (!p.offCode && !p.barcode) {
        const { prisma } = await import("@/lib/prisma");
        const slug = `user-${session.user.id}-${Date.now()}-${p.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 40)}`;
        const created = await prisma.foodItem.create({
          data: {
            slug,
            name: p.name,
            brand: p.brand ?? null,
            calories: p.calories,
            proteinG: p.proteinG,
            carbsG: p.carbsG,
            fatG: p.fatG,
            fiberG: p.fiberG ?? null,
            servingG: p.servingG,
            imageUrl: p.imageUrl ?? null,
            dataSource: "user",
            userId: session.user.id,
          },
        });
        return jsonOk({
          food: {
            id: created.id,
            name: created.name,
            brand: created.brand,
            calories: created.calories,
            proteinG: created.proteinG,
            carbsG: created.carbsG,
            fatG: created.fatG,
            fiberG: created.fiberG,
            servingG: created.servingG,
            source: "local" as const,
          },
        });
      }

      const product: FoodProduct = {
        ...p,
        brand: p.brand ?? null,
        fiberG: p.fiberG ?? null,
        source: p.offCode ? "openfoodfacts" : "local",
      };
      const saved = await upsertFoodFromProduct(product, session.user.id);
      return jsonOk({ food: saved });
    }

    return jsonError("offCode oder product erforderlich");
  } catch (e) {
    return handleApiError(e);
  }
}
