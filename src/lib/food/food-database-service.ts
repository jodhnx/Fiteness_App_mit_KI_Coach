import type { FoodCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { fetchOffProductByCode } from "@/lib/food/open-food-facts-client";
import { safePrisma } from "@/lib/prisma-safe";

const foodSelect = {
  id: true,
  slug: true,
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
} as const;

function slugify(parts: string[]) {
  return parts
    .join("-")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 110);
}

function offCategoryToEnum(cat?: string): FoodCategory {
  const c = (cat ?? "").toLowerCase();
  if (c.includes("meat") || c.includes("fleisch")) return "MEAT";
  if (c.includes("fish") || c.includes("fisch")) return "FISH";
  if (c.includes("milk") || c.includes("dairy") || c.includes("milch")) return "DAIRY";
  if (c.includes("fruit") || c.includes("obst")) return "FRUIT";
  if (c.includes("vegetable") || c.includes("gemuse")) return "VEGETABLES";
  if (c.includes("beverage") || c.includes("drink")) return "DRINKS";
  if (c.includes("snack") || c.includes("sweet")) return "SWEETS";
  return "OTHER";
}

export function mapDbFoodToProduct(row: {
  id: string;
  name: string;
  brand: string | null;
  category: FoodCategory;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  servingG: number;
  barcode: string | null;
  offCode: string | null;
  imageUrl: string | null;
  dataSource: string;
}): FoodProduct {
  return {
    id: row.id,
    offCode: row.offCode ?? undefined,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    calories: row.calories,
    proteinG: row.proteinG,
    carbsG: row.carbsG,
    fatG: row.fatG,
    fiberG: row.fiberG,
    servingG: row.servingG,
    imageUrl: row.imageUrl,
    category: row.category,
    source: row.dataSource === "openfoodfacts" ? "openfoodfacts" : "local",
  };
}

const foodSelectMinimal = {
  id: true,
  name: true,
  brand: true,
  category: true,
  calories: true,
  proteinG: true,
  carbsG: true,
  fatG: true,
  servingG: true,
  barcode: true,
} as const;

export async function searchLocalFoods(
  userId: string,
  query: string,
  limit = 15
): Promise<FoodProduct[]> {
  const q = query.trim();
  if (!q) return [];
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  const tokenClauses =
    tokens.length > 0
      ? tokens.map((t) => ({
          OR: [
            { name: { contains: t, mode: "insensitive" as const } },
            { brand: { contains: t, mode: "insensitive" as const } },
          ],
        }))
      : [
          {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { brand: { contains: q, mode: "insensitive" as const } },
            ],
          },
        ];
  const where = {
    AND: [{ OR: [{ userId: null }, { userId }] }, ...tokenClauses],
  };

  try {
    const rows = await prisma.foodItem.findMany({
      where,
      select: foodSelect,
      take: limit,
      orderBy: { name: "asc" },
    });
    return rows.map(mapDbFoodToProduct);
  } catch (e) {
    console.error("[food-database] full select failed, minimal fallback", e);
    const rows = await prisma.foodItem.findMany({
      where,
      select: foodSelectMinimal,
      take: limit,
      orderBy: { name: "asc" },
    });
    return rows.map((row) =>
      mapDbFoodToProduct({
        ...row,
        fiberG: null,
        offCode: null,
        imageUrl: null,
        dataSource: "local",
      })
    );
  }
}

export async function upsertFoodFromProduct(product: FoodProduct): Promise<FoodProduct> {
  const offCode = product.offCode ?? product.barcode ?? null;
  if (offCode) {
    const existing = await prisma.foodItem.findFirst({
      where: { OR: [{ offCode }, { barcode: offCode }] },
      select: foodSelect,
    });
    if (existing) {
      const updated = await prisma.foodItem.update({
        where: { id: existing.id },
        data: {
          name: product.name,
          brand: product.brand,
          calories: product.calories,
          proteinG: product.proteinG,
          carbsG: product.carbsG,
          fatG: product.fatG,
          fiberG: product.fiberG,
          servingG: product.servingG,
          imageUrl: product.imageUrl,
          dataSource: "openfoodfacts",
        },
        select: foodSelect,
      });
      return mapDbFoodToProduct(updated);
    }
  }

  const slug = slugify([
    "off",
    offCode ?? product.name,
    product.brand ?? "",
  ]);
  const created = await prisma.foodItem.upsert({
    where: { slug },
    create: {
      slug,
      name: product.name,
      brand: product.brand,
      category: offCategoryToEnum(product.category),
      calories: product.calories,
      proteinG: product.proteinG,
      carbsG: product.carbsG,
      fatG: product.fatG,
      fiberG: product.fiberG,
      servingG: product.servingG,
      barcode: offCode,
      offCode,
      imageUrl: product.imageUrl,
      dataSource: product.source === "openfoodfacts" ? "openfoodfacts" : "local",
    },
    update: {
      name: product.name,
      brand: product.brand,
      calories: product.calories,
      proteinG: product.proteinG,
      carbsG: product.carbsG,
      fatG: product.fatG,
      fiberG: product.fiberG,
      servingG: product.servingG,
      imageUrl: product.imageUrl,
      offCode,
      barcode: offCode,
      dataSource:
        product.source === "openfoodfacts" && offCode ? "openfoodfacts" : "local",
    },
    select: foodSelect,
  });
  return mapDbFoodToProduct(created);
}

export async function importOffProductByCode(code: string): Promise<{
  product: FoodProduct | null;
  error?: string;
}> {
  const { product, error } = await fetchOffProductByCode(code);
  if (!product) return { product: null, error };
  const saved = await upsertFoodFromProduct(product);
  return { product: saved };
}

export async function recordSearchQuery(userId: string, query: string) {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return;
  await safePrisma(
    async () => {
      await prisma.foodSearchHistory.create({
        data: { userId, query: q },
      });
      const old = await prisma.foodSearchHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: 30,
        select: { id: true },
      });
      if (old.length > 0) {
        await prisma.foodSearchHistory.deleteMany({
          where: { id: { in: old.map((o) => o.id) } },
        });
      }
    },
    undefined,
    { logLabel: "recordSearchQuery" }
  );
}

export async function getRecentSearchQueries(userId: string, limit = 8): Promise<string[]> {
  try {
    const rows = await prisma.foodSearchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit * 3,
      select: { query: true },
    });
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of rows) {
      const key = r.query.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r.query);
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}
