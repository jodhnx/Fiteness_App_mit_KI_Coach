import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { z } from "zod";
import { tableExists } from "@/lib/prisma-safe";
import { isSchemaMismatchError } from "@/lib/prisma-errors";

const foodSelect = {
  id: true,
  name: true,
  brand: true,
  category: true,
  calories: true,
  proteinG: true,
  carbsG: true,
  fatG: true,
  servingG: true,
} as const;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    if (!(await tableExists("FoodFavorite"))) {
      return jsonOk({ foods: [], pinnedIds: [] });
    }
    const favorites = await prisma.foodFavorite.findMany({
      where: { userId: session.user.id },
      include: { foodItem: { select: foodSelect } },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });
    return jsonOk({
      foods: favorites.map((f) => f.foodItem),
      pinnedIds: favorites.filter((f) => f.pinned).map((f) => f.foodItemId),
    });
  } catch (e) {
    if (isSchemaMismatchError(e)) return jsonOk({ foods: [], pinnedIds: [] });
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = z.object({ foodItemId: z.string() }).safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");
    if (!(await tableExists("FoodFavorite"))) {
      return jsonError("Favoriten nicht verfügbar — Migration ausführen", 503);
    }
    await prisma.foodFavorite.upsert({
      where: {
        userId_foodItemId: {
          userId: session.user.id,
          foodItemId: parsed.data.foodItemId,
        },
      },
      create: {
        userId: session.user.id,
        foodItemId: parsed.data.foodItemId,
      },
      update: {},
    });
    return jsonOk({ ok: true }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = z
      .object({ foodItemId: z.string(), pinned: z.boolean() })
      .safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");
    await prisma.foodFavorite.updateMany({
      where: {
        userId: session.user.id,
        foodItemId: parsed.data.foodItemId,
      },
      data: { pinned: parsed.data.pinned },
    });
    return jsonOk({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const foodItemId = req.nextUrl.searchParams.get("foodItemId");
    if (!foodItemId) return jsonError("foodItemId fehlt");
    await prisma.foodFavorite.deleteMany({
      where: { userId: session.user.id, foodItemId },
    });
    return jsonOk({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
