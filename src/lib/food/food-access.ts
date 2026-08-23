/**
 * Central FoodItem accessibility rules.
 *
 * A FoodItem is accessible to a user when it is either
 * global catalog data (`userId === null`) or owned by that user.
 * Private FoodItems of other users must never be read or modified.
 */

import { prisma } from "@/lib/prisma";

/** Prisma `where` fragment for "global or own" FoodItem rows. */
export function accessibleFoodItemFilter(userId: string) {
  return { OR: [{ userId: null }, { userId }] };
}

/** Returns the id when the FoodItem exists and is accessible, otherwise null. */
export async function findAccessibleFoodItemId(
  id: string,
  userId: string
): Promise<string | null> {
  const row = await prisma.foodItem.findFirst({
    where: { id, ...accessibleFoodItemFilter(userId) },
    select: { id: true },
  });
  return row?.id ?? null;
}

/**
 * Batched check for many ids at once.
 * Returns the ids that are missing or owned by another user.
 */
export async function findInaccessibleFoodItemIds(
  ids: readonly string[],
  userId: string
): Promise<string[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];

  const rows = await prisma.foodItem.findMany({
    where: { id: { in: unique }, ...accessibleFoodItemFilter(userId) },
    select: { id: true },
  });

  const accessible = new Set(rows.map((r) => r.id));
  return unique.filter((id) => !accessible.has(id));
}
