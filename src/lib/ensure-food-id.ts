import type { FoodProduct } from "@/lib/food/food-product-types";

export type EnsureFoodResult = { id: string } | { error: string };

export async function ensureFoodItemId(product: FoodProduct): Promise<EnsureFoodResult> {
  if (product.id && product.source === "local") {
    return { id: product.id };
  }

  if (product.id && !product.offCode) {
    const check = await fetch(`/api/food?id=${encodeURIComponent(product.id)}`);
    if (check.ok) {
      const d = await check.json();
      if (d.food?.id) return { id: d.food.id };
    }
  }

  if (!product.offCode && product.id) {
    return { id: product.id };
  }

  if (!product.offCode) {
    return { error: "Produkt hat keine Barcode-ID" };
  }

  const imp = await fetch("/api/food/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product }),
  });
  const d = await imp.json();
  if (!imp.ok || !d.food?.id) {
    return { error: (d as { error?: string }).error ?? "Produkt konnte nicht gespeichert werden" };
  }
  return { id: d.food.id as string };
}
