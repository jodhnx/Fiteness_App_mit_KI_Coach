"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Heart } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Input } from "@/components/ui/input";
import { RecipeCard } from "@/components/recipes/recipe-card";
import {
  FITNESS_RECIPES,
  RECIPE_FILTERS,
  searchFitnessRecipes,
  type FitnessRecipe,
} from "@/data/fitness-recipes";
import { getCached, setCached } from "@/lib/client-cache";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { hapticTap } from "@/lib/haptic";

const FAV_CACHE = "recipe-catalog-favorites";
const LIST_CACHE = "recipe-catalog-list";

type CatalogPayload = {
  recipes: FitnessRecipe[];
  favoriteIds: string[];
};

export default function RezeptePage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(
    () => getCached<string[]>(FAV_CACHE) ?? []
  );

  useEffect(() => {
    setCached(LIST_CACHE, FITNESS_RECIPES, 3_600_000);

    void fetch("/api/recipes/catalog", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: CatalogPayload | null) => {
        if (!d) return;
        setFavoriteIds(d.favoriteIds ?? []);
        setCached(FAV_CACHE, d.favoriteIds ?? [], 180_000);
      })
      .catch(() => undefined);
  }, []);

  const results = useMemo(
    () => searchFitnessRecipes(query, filters),
    [query, filters]
  );

  const favorites = useMemo(
    () => FITNESS_RECIPES.filter((r) => favoriteIds.includes(r.id)),
    [favoriteIds]
  );

  const toggleFilter = useCallback((id: string) => {
    hapticTap();
    setFilters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const toggleFavorite = useCallback(
    async (recipeId: string) => {
      hapticTap();
      const was = favoriteIds.includes(recipeId);
      const next = was
        ? favoriteIds.filter((id) => id !== recipeId)
        : [recipeId, ...favoriteIds];
      setFavoriteIds(next);
      setCached(FAV_CACHE, next, 180_000);

      const res = await fetch("/api/recipes/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
      if (!res.ok) {
        setFavoriteIds(favoriteIds);
        setCached(FAV_CACHE, favoriteIds, 180_000);
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Favorit konnte nicht gespeichert werden");
      }
    },
    [favoriteIds]
  );

  const grouped = useMemo(() => {
    const order = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;
    const labels = {
      BREAKFAST: "Frühstück",
      LUNCH: "Mittagessen",
      DINNER: "Abendessen",
      SNACK: "Snacks",
    };
    if (query || filters.length > 0) {
      return [{ key: "results", label: "Ergebnisse", items: results }];
    }
    return order.map((key) => ({
      key,
      label: labels[key],
      items: FITNESS_RECIPES.filter((r) => r.mealSlot === key),
    }));
  }, [query, filters, results]);

  let cardIndex = 0;

  return (
    <PageShell
      title="Rezepte"
      subtitle={`${FITNESS_RECIPES.length} Fitness-Rezepte · Suche & Filter`}
      maxWidth="2xl"
      className="space-y-4 pb-28"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rezept suchen…"
          className="h-12 rounded-2xl pl-10"
          autoComplete="off"
        />
      </div>

      <div className="scrollbar-none -mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-1">
        {RECIPE_FILTERS.map((f) => {
          const on = filters.includes(f.id);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => toggleFilter(f.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold",
                on
                  ? "border-accent bg-accent text-zinc-950"
                  : "border-white/[0.08] bg-zinc-900/80 text-zinc-400"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {favorites.length > 0 && !query && filters.length === 0 && (
        <section className="space-y-2.5">
          <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">
            <Heart className="h-3.5 w-3.5 text-rose-400" />
            Meine Favoriten
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {favorites.map((r) => {
              const priority = cardIndex++ < 4;
              return (
                <RecipeCard
                  key={`fav-${r.id}`}
                  recipe={r}
                  favorited
                  priority={priority}
                  onToggleFavorite={toggleFavorite}
                />
              );
            })}
          </div>
        </section>
      )}

      {grouped.map((g) =>
        g.items.length === 0 ? null : (
          <section key={g.key} className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">
              {g.label}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {g.items.map((r) => {
                const priority = cardIndex++ < 4;
                return (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    favorited={favoriteIds.includes(r.id)}
                    priority={priority}
                    onToggleFavorite={toggleFavorite}
                  />
                );
              })}
            </div>
          </section>
        )
      )}

      {results.length === 0 && (query || filters.length > 0) && (
        <p className="py-10 text-center text-sm text-zinc-500">
          Keine Rezepte gefunden
        </p>
      )}
    </PageShell>
  );
}
