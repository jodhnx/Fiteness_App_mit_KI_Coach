import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { recipeSchema } from "@/lib/validations";
import { macrosForQuantity, sumMacros, roundMacros } from "@/lib/food-macros";

function recipeMacros(
  ingredients: { quantityG: number; foodItem: { calories: number; proteinG: number; carbsG: number; fatG: number; servingG: number } }[],
  servings: number
) {
  const total = roundMacros(
    sumMacros(ingredients.map((i) => macrosForQuantity(i.foodItem, i.quantityG)))
  );
  return {
    perServing: {
      calories: Math.round(total.calories / servings),
      proteinG: Math.round(total.proteinG / servings),
      carbsG: Math.round(total.carbsG / servings),
      fatG: Math.round(total.fatG / servings),
    },
    total,
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const recipes = await prisma.recipe.findMany({
      where: { userId: session.user.id },
      include: {
        ingredients: { include: { foodItem: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return jsonOk({
      recipes: recipes.map((r) => ({
        id: r.id,
        name: r.name,
        servings: r.servings,
        description: r.description,
        isMealTemplate: r.isMealTemplate,
        ingredients: r.ingredients.map((i) => ({
          foodItemId: i.foodItemId,
          name: i.foodItem.name,
          quantityG: i.quantityG,
        })),
        macros: recipeMacros(r.ingredients, r.servings),
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = recipeSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const recipe = await prisma.recipe.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        servings: parsed.data.servings,
        description: parsed.data.description,
        isMealTemplate: parsed.data.isMealTemplate ?? false,
        ingredients: {
          create: parsed.data.ingredients.map((i) => ({
            foodItemId: i.foodItemId,
            quantityG: i.quantityG,
          })),
        },
      },
      include: { ingredients: { include: { foodItem: true } } },
    });
    return jsonOk(
      {
        recipe: {
          id: recipe.id,
          name: recipe.name,
          servings: recipe.servings,
          macros: recipeMacros(recipe.ingredients, recipe.servings),
        },
      },
      201
    );
  } catch (e) {
    return handleApiError(e);
  }
}
