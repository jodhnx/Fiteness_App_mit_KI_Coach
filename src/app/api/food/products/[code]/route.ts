import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import {
  importOffProductByCode,
  mapDbFoodToProduct,
} from "@/lib/food/food-database-service";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { code } = await params;
    const normalized = code.replace(/\D/g, "");

    const local = await prisma.foodItem.findFirst({
      where: { OR: [{ offCode: normalized }, { barcode: normalized }] },
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        calories: true,
        proteinG: true,
        carbsG: true,
        fatG: true,
        fiberG: true,
        servingG: true,
        barcode: true,
        offCode: true,
        imageUrl: true,
        dataSource: true,
      },
    });
    if (local) {
      return jsonOk({ product: mapDbFoodToProduct(local), source: "database" });
    }

    const { product, error } = await importOffProductByCode(normalized);
    if (!product) {
      return jsonOk({
        product: null,
        found: false,
        error: error ?? "Produkt nicht gefunden",
      });
    }
    return jsonOk({ product, found: true, source: "openfoodfacts" });
  } catch (e) {
    return handleApiError(e);
  }
}
