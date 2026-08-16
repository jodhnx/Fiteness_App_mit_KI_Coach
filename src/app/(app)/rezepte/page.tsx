"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Heart, Loader2 } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Input } from "@/components/ui/input";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { RECIPE_FILTERS } from "@/data/fitness-recipes";
import type { RecipeListItem } from "@/lib/recipes/catalog-query";
import { getCached } from "@/lib/client-cache";
import {
  patchRecipeFavoriteIds,
  readRecipeCatalogCache,
  readDefaultRecipeCatalog,
  readRecipeUiState,
  writeRecipeCatalogCache,
  writeRecipeUiState,
  RECIPE_FAV_CACHE_KEY,
} from "@/lib/recipe-catalog-cache";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { hapticTap } from "@/lib/haptic";
import { Button } from "@/components/ui/button";

type CatalogResponse = {
  recipes: RecipeListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  favoriteIds: string[];
  catalogTotal: number;
};

function hydrateInitial() {
  const ui = readRecipeUiState();
  const q = ui?.query ?? "";
  const filters = ui?.filters ?? [];
  const cached =
    readRecipeCatalogCache(q, filters) ??
    (!q && filters.length === 0 ? readDefaultRecipeCatalog() : null);
  const favs = getCached<string[]>(RECIPE_FAV_CACHE_KEY, { allowStale: true }) ?? [];

  if (cached?.recipes?.length) {
    return {
      recipes: cached.recipes,
      page: cached.page,
      hasMore: cached.hasMore,
      total: cached.total,
      catalogTotal: cached.catalogTotal,
      favoriteIds: cached.favoriteIds?.length ? cached.favoriteIds : favs,
      query: q,
      filters,
      loading: false,
    };
  }

  return {
    recipes: [] as RecipeListItem[],
    page: 1,
    hasMore: false,
    total: 0,
    catalogTotal: 0,
    favoriteIds: favs,
    query: q,
    filters,
    loading: true,
  };
}

export default function RezeptePage() {
  const initial = useRef(hydrateInitial()).current;
  const [query, setQuery] = useState(initial.query);
  const [debouncedQ, setDebouncedQ] = useState(initial.query.trim());
  const [filters, setFilters] = useState<string[]>(initial.filters);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(initial.favoriteIds);
  const [recipes, setRecipes] = useState<RecipeListItem[]>(initial.recipes);
  const recipesRef = useRef(recipes);
  recipesRef.current = recipes;
  const [page, setPage] = useState(initial.page);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [total, setTotal] = useState(initial.total);
  const [catalogTotal, setCatalogTotal] = useState(initial.catalogTotal);
  const [loading, setLoading] = useState(initial.loading);
  const [softLoading, setSoftLoading] = useState(false);
  const skipFirstDebounce = useRef(true);

  useEffect(() => {
    if (skipFirstDebounce.current) {
      skipFirstDebounce.current = false;
      return;
    }
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), 220);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    writeRecipeUiState({ query, filters });
  }, [query, filters]);

  const load = useCallback(
    async (pageNum: number, append: boolean, opts?: { soft?: boolean }) => {
      const soft = Boolean(opts?.soft && !append && recipesRef.current.length > 0);
      if (soft) setSoftLoading(true);
      else if (!append) setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("page", String(pageNum));
        params.set("limit", "24");
        if (debouncedQ) params.set("q", debouncedQ);
        for (const f of filters) params.append("filter", f);

        const res = await fetch(`/api/recipes/catalog?${params}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Laden fehlgeschlagen");
        const data = (await res.json()) as CatalogResponse;
        const nextRecipes = append
          ? [...recipesRef.current, ...data.recipes]
          : data.recipes;
        setRecipes(nextRecipes);
        setHasMore(data.hasMore);
        setTotal(data.total);
        setCatalogTotal(data.catalogTotal ?? data.total);
        setPage(data.page);
        setFavoriteIds(data.favoriteIds ?? []);
        writeRecipeCatalogCache({
          recipes: nextRecipes,
          total: data.total,
          catalogTotal: data.catalogTotal ?? data.total,
          page: data.page,
          hasMore: data.hasMore,
          favoriteIds: data.favoriteIds ?? [],
          q: debouncedQ,
          filters,
        });
      } catch {
        if (!recipesRef.current.length) {
          toast.error("Rezepte konnten nicht geladen werden");
        }
      } finally {
        setLoading(false);
        setSoftLoading(false);
      }
    },
    [debouncedQ, filters]
  );

  useEffect(() => {
    const cached = readRecipeCatalogCache(debouncedQ, filters);
    if (cached?.recipes?.length) {
      setRecipes(cached.recipes);
      setHasMore(cached.hasMore);
      setTotal(cached.total);
      setCatalogTotal(cached.catalogTotal);
      setPage(cached.page);
      setFavoriteIds(cached.favoriteIds);
      setLoading(false);
      if (Date.now() - cached.fetchedAt > 120_000) {
        void load(1, false, { soft: true });
      }
      return;
    }
    void load(1, false);
  }, [debouncedQ, filters, load]);

  const favorites = useMemo(
    () => recipes.filter((r) => favoriteIds.includes(r.id)),
    [recipes, favoriteIds]
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
      patchRecipeFavoriteIds(next);

      const res = await fetch("/api/recipes/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
      if (!res.ok) {
        setFavoriteIds(favoriteIds);
        patchRecipeFavoriteIds(favoriteIds);
        toast.error("Favorit konnte nicht gespeichert werden");
      }
    },
    [favoriteIds]
  );

  return (
    <PageShell
      title="Rezepte"
      subtitle={
        catalogTotal > 0
          ? `${catalogTotal} Rezepte · Suche, Filter & Favoriten`
          : "Fitness-Rezepte"
      }
      maxWidth="2xl"
      className="space-y-4 pb-28"
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rezept oder Zutat suchen…"
          className="h-12 rounded-2xl pl-10"
          autoComplete="off"
        />
        {softLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-600" />
        )}
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

      {favorites.length > 0 && !debouncedQ && filters.length === 0 && (
        <section className="space-y-2.5">
          <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">
            <Heart className="h-3.5 w-3.5 text-rose-400" />
            Favoriten
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {favorites.slice(0, 8).map((r, i) => (
              <RecipeCard
                key={`fav-${r.id}`}
                recipe={r}
                favorited
                priority={i < 2}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2.5">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">
          {debouncedQ || filters.length > 0
            ? `${total} Ergebnisse`
            : "Entdecken"}
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {recipes.map((r, i) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              favorited={favoriteIds.includes(r.id)}
              priority={i < 4}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      </section>

      {loading && recipes.length === 0 && (
        <div className="flex justify-center py-12 text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!loading && recipes.length === 0 && (
        <p className="py-10 text-center text-sm text-zinc-500">
          Keine Rezepte gefunden
        </p>
      )}

      {hasMore && (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          disabled={loading || softLoading}
          onClick={() => void load(page + 1, true)}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Mehr laden"
          )}
        </Button>
      )}
    </PageShell>
  );
}
