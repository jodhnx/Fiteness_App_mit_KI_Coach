import type { FoodProduct } from "@/lib/food/food-product-types";

export type EnsureFoodResult = { id: string } | { error: string };

export async function ensureFoodItemId(product: FoodProduct): Promise<EnsureFoodResult> {
  if (product.id) {
    const check = await fetch(`/api/food?id=${encodeURIComponent(product.id)}`);
    if (check.ok) {
      const d = await check.json();
      if (d.food?.id) return { id: d.food.id };
    }
  }

  if (product.offCode) {
    const byCode = await fetch("/api/food/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offCode: product.offCode }),
    });
    const codeData = await byCode.json();
    if (byCode.ok && codeData.food?.id) {
      return { id: codeData.food.id as string };
    }
  }

  const imp = await fetch("/api/food/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product: {
        offCode: product.offCode,
        name: product.name,
        brand: product.brand,
        calories: product.calories,
        proteinG: product.proteinG,
        carbsG: product.carbsG,
        fatG: product.fatG,
        fiberG: product.fiberG ?? null,
        servingG: product.servingG || 100,
        imageUrl: product.imageUrl ?? null,
        barcode: product.barcode ?? null,
      },
    }),
  });
  const d = await imp.json();
  if (!imp.ok || !d.food?.id) {
    return {
      error: (d as { error?: string }).error ?? "Produkt konnte nicht gespeichert werden",
    };
  }
  return { id: d.food.id as string };
}
