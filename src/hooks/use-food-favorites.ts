"use client";

import { useCallback, useEffect, useState } from "react";
import type { FoodProduct } from "@/lib/food/food-product-types";

export function useFoodFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteFoods, setFavoriteFoods] = useState<FoodProduct[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(() => {
    return fetch("/api/nutrition/favorites")
      .then((r) => r.json())
      .then((d) => {
        const foods = (d.foods ?? []) as FoodProduct[];
        setFavoriteFoods(foods);
        setFavoriteIds(new Set(foods.map((f) => f.id).filter(Boolean) as string[]));
      })
      .catch(() => {
        setFavoriteFoods([]);
        setFavoriteIds(new Set());
      });
  }, []);

  useEffect(() => {
    reload().finally(() => setReady(true));
  }, [reload]);

  const toggleFavorite = useCallback(
    async (food: FoodProduct) => {
      const id = food.id;
      if (!id) return false;
      const isFav = favoriteIds.has(id);
      if (isFav) {
        await fetch(`/api/nutrition/favorites?foodItemId=${id}`, { method: "DELETE" });
      } else {
        await fetch("/api/nutrition/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ foodItemId: id }),
        });
      }
      await reload();
      return !isFav;
    },
    [favoriteIds, reload]
  );

  const isFavorite = useCallback(
    (food: FoodProduct) => (food.id ? favoriteIds.has(food.id) : false),
    [favoriteIds]
  );

  return {
    favoriteIds,
    favoriteFoods,
    ready,
    reload,
    toggleFavorite,
    isFavorite,
  };
}
