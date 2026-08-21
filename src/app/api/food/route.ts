import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { FoodCategory } from "@prisma/client";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { customFoodSchema } from "@/lib/validations";

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
  servingG: true,
  barcode: true,
} as const;

function slugify(name: string) {
  return `${name}-${Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 100);
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const food = await prisma.foodItem.findUnique({
        where: { id },
        select: foodSelect,
      });
      if (!food) return jsonError("Nicht gefunden", 404);
      return jsonOk({ food });
    }

    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    const category = req.nextUrl.searchParams.get("category") as FoodCategory | null;
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 40), 80);

    const foods = await prisma.foodItem.findMany({
      where: {
        OR: [{ userId: null }, { userId: session.user.id }],
        AND: [
          category ? { category } : {},
          q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { brand: { contains: q, mode: "insensitive" } },
                ],
              }
            : {},
        ],
      },
      select: foodSelect,
      take: limit,
      orderBy: q ? { name: "asc" } : { name: "asc" },
    });
    return jsonOk({ foods });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = customFoodSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const slug = slugify(parsed.data.name);
    let barcode = parsed.data.barcode || null;
    if (barcode) {
      const existing = await prisma.foodItem.findFirst({
        where: { OR: [{ barcode }, { offCode: barcode }] },
        select: { id: true },
      });
      // Never overwrite global catalog — keep barcode only if free (user-private row)
      if (existing) barcode = null;
    }

    const food = await prisma.foodItem.create({
      data: {
        slug,
        name: parsed.data.name,
        brand: parsed.data.brand || null,
        barcode,
        category: parsed.data.category ?? "OTHER",
        calories: parsed.data.calories,
        proteinG: parsed.data.proteinG,
        carbsG: parsed.data.carbsG,
        fatG: parsed.data.fatG,
        servingG: parsed.data.servingG,
        userId: session.user.id,
        dataSource: "user_custom",
      },
      select: foodSelect,
    });
    return jsonOk(
      {
        food: {
          ...food,
          source: "local" as const,
          servingLabel: `${food.servingG} g`,
        },
      },
      201
    );
  } catch (e) {
    return handleApiError(e);
  }
}
