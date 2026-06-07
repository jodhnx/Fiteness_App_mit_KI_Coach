import { redirect } from "next/navigation";
import { MEAL_TYPE_ORDER } from "@/lib/meal-types";
import type { MealType } from "@prisma/client";

const VALID = new Set<string>(MEAL_TYPE_ORDER);

export default async function AddFoodPage({
  params,
}: {
  params: Promise<{ mealType: string }>;
}) {
  const { mealType: raw } = await params;
  const mealType = VALID.has(raw) ? raw : "LUNCH";
  redirect(`/nutrition?add=${mealType as MealType}`);
}
