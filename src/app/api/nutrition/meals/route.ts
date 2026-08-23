import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mealSchema } from "@/lib/validations";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { findInaccessibleFoodItemIds } from "@/lib/food/food-access";
import { startOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const dateParam = req.nextUrl.searchParams.get("date");
    const date = dateParam ? startOfDay(new Date(dateParam)) : startOfDay(new Date());
    const meals = await prisma.meal.findMany({
      where: { userId: session.user.id, date },
      include: { items: { include: { foodItem: true } } },
      orderBy: { createdAt: "asc" },
    });
    return jsonOk({ meals });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = mealSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const inaccessible = await findInaccessibleFoodItemIds(
      parsed.data.items.map((i) => i.foodItemId),
      session.user.id
    );
    if (inaccessible.length > 0) {
      return jsonError("Lebensmittel nicht gefunden", 404);
    }

    const meal = await prisma.meal.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        mealType: parsed.data.mealType,
        date: startOfDay(new Date(parsed.data.date)),
        items: {
          create: parsed.data.items.map((i) => ({
            foodItemId: i.foodItemId,
            quantityG: i.quantityG,
          })),
        },
      },
      include: { items: { include: { foodItem: true } } },
    });
    return jsonOk({ meal }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
