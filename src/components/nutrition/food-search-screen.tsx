"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Search, Star, ChefHat, UtensilsCrossed } from "lucide-react";
import { FavoriteStar } from "@/components/nutrition/favorite-star";
import type { FoodProduct, FoodSearchResponse } from "@/lib/food/food-product-types";
import { getCached, setCached } from "@/lib/client-cache";
import { macrosPer100g } from "@/lib/food-per-100g";
import { fmtG, fmtKcal } from "@/lib/format-macros";
import { cn } from "@/lib/utils";

type SavedItem = {
  id: string;
  name: string;
  macros?: { perServing: { calories: number; proteinG: number } };
  ingredients?: { name: string; quantityG: number }[];
};

type Props = {
  onSelectFood: (food: FoodProduct) => void;
  onLogSavedMeal: (recipeId: string, name: string) => void;
  isFavorite: (food: FoodProduct) => boolean;
  onToggleFavorite: (food: FoodProduct) => void;
  favoriteFoods?: FoodProduct[];
};

const SEARCH_TTL = 120_000;

function FoodChip({
  food,
  onClick,
  isFavorite,
  onToggleFavorite,
}: {
  food: FoodProduct;
  onClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const per100 = macrosPer100g({
    calories: food.calories,
    proteinG: food.proteinG,
    carbsG: food.carbsG,
    fatG: food.fatG,
    servingG: food.servingG,
  });
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 min-w-[132px] max-w-[160px] card-premium px-3 py-2.5 text-left hover:border-accent active:scale-[0.98]"
    >
      <p className="text-sm font-medium text-white truncate">{food.name}</p>
      <p className="text-[11px] text-zinc-500 tabular-nums mt-0.5">
        {fmtKcal(per100.calories)} kcal
      </p>
      {food.id && (
        <span
          role="presentation"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="inline-block mt-1"
        >
          <FavoriteStar active={isFavorite} onToggle={onToggleFavorite} size="sm" />
        </span>
      )}
    </button>
  );
}

function FoodResultRow({
  food,
  onClick,
  isFavorite,
  onToggleFavorite,
}: {
  food: FoodProduct;
  onClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const per100 = macrosPer100g({
    calories: food.calories,
    proteinG: food.proteinG,
    carbsG: food.carbsG,
    fatG: food.fatG,
    servingG: food.servingG,
  });
  return (
    <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 pr-2 hover:border-zinc-600">
      <button
        type="button"
        onClick={onClick}
        className="flex-1 text-left px-4 py-3.5 min-w-0 active:scale-[0.99]"
      >
        <p className="font-medium text-white text-[15px] leading-snug">{food.name}</p>
        {food.brand && <p className="text-xs text-zinc-500 mt-0.5">{food.brand}</p>}
        <p className="text-xs text-zinc-400 mt-1.5 tabular-nums">
          {fmtKcal(per100.calories)} kcal / 100g · {fmtG(per100.proteinG)} g Protein
        </p>
      </button>
      {food.id && (
        <FavoriteStar active={isFavorite} onToggle={onToggleFavorite} size="sm" />
      )}
    </div>
  );
}

function SavedMealRow({
  item,
  onClick,
}: {
  item: SavedItem;
  onClick: () => void;
}) {
  const kcal = item.macros?.perServing?.calories;
  const protein = item.macros?.perServing?.proteinG;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3.5 hover:border-accent active:scale-[0.99]"
    >
      <p className="font-medium text-white">{item.name}</p>
      <p className="text-xs text-zinc-500 mt-1">
        {item.ingredients?.length ?? 0} Zutaten
        {kcal != null && (
          <span className="text-zinc-400">
            {" "}
            · {kcal} kcal · {protein ?? 0} g Protein
          </span>
        )}
      </p>
    </button>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
      {children}
    </h3>
  );
}

export function FoodSearchScreen({
  onSelectFood,
  onLogSavedMeal,
  isFavorite,
  onToggleFavorite,
  favoriteFoods = [],
}: Props) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 120);
  const [libraryTab, setLibraryTab] = useState<
    "favorites" | "recent" | "frequent" | "recipes"
  >("recent");
  const [result, setResult] = useState<FoodSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{
    recents: FoodProduct[];
    frequent: FoodProduct[];
    favorites: FoodProduct[];
  }>({ recents: [], frequent: [], favorites: [] });
  const [savedMeals, setSavedMeals] = useState<SavedItem[]>([]);
  const [recipes, setRecipes] = useState<SavedItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const isSearching = debouncedQ.trim().length >= 2;

  useEffect(() => {
    fetch("/api/food/history")
      .then((r) => r.json())
      .then((d) => {
        setHistory({
          recents: (d.recents ?? []) as FoodProduct[],
          frequent: ((d.frequent ?? d.recents) as FoodProduct[]).slice(0, 10),
          favorites: (d.favorites ?? []) as FoodProduct[],
        });
      })
      .catch(() => {});
    fetch("/api/nutrition/recipes")
      .then((r) => r.json())
      .then((d) => {
        const all = (d.recipes ?? []) as SavedItem[];
        setSavedMeals(all.filter((r: SavedItem & { isMealTemplate?: boolean }) => r.isMealTemplate));
        setRecipes(all.filter((r: SavedItem & { isMealTemplate?: boolean }) => !r.isMealTemplate));
      })
      .catch(() => {});
  }, []);

  const useCountByFoodId = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of history.frequent) {
      const id = f.id ?? f.offCode;
      if (id) m.set(id, (f as FoodProduct & { useCount?: number }).useCount ?? 0);
    }
    return m;
  }, [history.frequent]);

  const favorites = useMemo(() => {
    const list = favoriteFoods.length > 0 ? favoriteFoods : history.favorites;
    return [...list]
      .sort((a, b) => {
        const ac = useCountByFoodId.get(a.id ?? a.offCode ?? "") ?? 0;
        const bc = useCountByFoodId.get(b.id ?? b.offCode ?? "") ?? 0;
        return bc - ac;
      })
      .slice(0, 24);
  }, [favoriteFoods, history.favorites, useCountByFoodId]);

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }
    const cacheKey = `food-search:${trimmed.toLowerCase()}`;
    const cached = getCached<FoodSearchResponse>(cacheKey);
    if (cached) {
      setResult(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch(
        `/api/food/search?q=${encodeURIComponent(trimmed)}`,
        { signal: ac.signal }
      );
      const data = await res.json();
      if (!ac.signal.aborted) {
        setResult(data);
        setCached(cacheKey, data, SEARCH_TTL);
      }
    } catch {
      /* aborted */
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQ.trim().length >= 2) search(debouncedQ);
    else setResult(null);
  }, [debouncedQ, search]);

  const searchResults = isSearching && result ? result.products : [];

  return (
    <div className="flex flex-col max-w-lg mx-auto w-full pb-8">
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-md px-4 pt-2 pb-3 border-b border-zinc-800/50">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Lebensmittel suchen..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-12 pl-12 text-base rounded-xl border-zinc-700 bg-zinc-900"
            autoFocus
          />
        </div>
        {!isSearching && (
          <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-hide">
            {(
              [
                { id: "recent" as const, label: "Zuletzt", icon: UtensilsCrossed },
                { id: "frequent" as const, label: "Häufig", icon: UtensilsCrossed },
                { id: "favorites" as const, label: "Favoriten", icon: Star },
                { id: "recipes" as const, label: "Rezepte", icon: ChefHat },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setLibraryTab(t.id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                  libraryTab === t.id
                    ? "bg-accent text-[var(--accent-fg)]"
                    : "bg-zinc-800 text-zinc-400"
                )}
              >
                <t.icon
                  className={cn(
                    "h-3.5 w-3.5",
                    t.id === "favorites" && libraryTab === "favorites" && "fill-current"
                  )}
                />
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-5">
        {loading && isSearching && (
          <p className="text-sm text-zinc-500 text-center py-8 animate-pulse">Suche…</p>
        )}

        {isSearching && !loading && (
          <>
            <SectionTitle>Suchergebnisse</SectionTitle>
            {searchResults.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">Keine Treffer</p>
            ) : (
              searchResults.map((food, i) => (
                <FoodResultRow
                  key={food.id ?? food.offCode ?? `${food.name}-${i}`}
                  food={food}
                  onClick={() => onSelectFood(food)}
                  isFavorite={isFavorite(food)}
                  onToggleFavorite={() => onToggleFavorite(food)}
                />
              ))
            )}
          </>
        )}

        {!isSearching && libraryTab === "favorites" && (
          <>
            {favorites.length === 0 ? (
              <p className="text-sm text-zinc-500 py-8 text-center">
                Noch keine Favoriten — markiere Lebensmittel mit dem Stern.
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                {favorites.map((food, i) => (
                  <FoodChip
                    key={food.id ?? `${food.name}-${i}`}
                    food={food}
                    onClick={() => onSelectFood(food)}
                    isFavorite={isFavorite(food)}
                    onToggleFavorite={() => onToggleFavorite(food)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!isSearching && libraryTab === "recent" && (
          <>
            {history.recents.length === 0 ? (
              <p className="text-sm text-zinc-500 py-8 text-center">Noch nichts zuletzt verwendet.</p>
            ) : (
              <div className="space-y-2">
                {history.recents.slice(0, 12).map((food, i) => (
                  <FoodResultRow
                    key={food.id ?? food.offCode ?? `r-${i}`}
                    food={food}
                    onClick={() => onSelectFood(food)}
                    isFavorite={isFavorite(food)}
                    onToggleFavorite={() => onToggleFavorite(food)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!isSearching && libraryTab === "frequent" && (
          <>
            {history.frequent.length === 0 ? (
              <p className="text-sm text-zinc-500 py-8 text-center">Noch keine häufigen Lebensmittel.</p>
            ) : (
              <div className="space-y-2">
                {history.frequent.slice(0, 12).map((food, i) => (
                  <FoodResultRow
                    key={food.id ?? food.offCode ?? `f-${i}`}
                    food={food}
                    onClick={() => onSelectFood(food)}
                    isFavorite={isFavorite(food)}
                    onToggleFavorite={() => onToggleFavorite(food)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!isSearching && libraryTab === "recipes" && (
          <>
            {recipes.length === 0 && savedMeals.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-zinc-500">Keine Rezepte oder Mahlzeiten.</p>
                <a
                  href="/nutrition/saved-meals/new"
                  className="inline-block text-sm text-accent font-medium hover:underline"
                >
                  + Rezept / Mahlzeit anlegen
                </a>
              </div>
            ) : (
              <>
                {recipes.map((m) => (
                  <SavedMealRow
                    key={m.id}
                    item={m}
                    onClick={() => onLogSavedMeal(m.id, m.name)}
                  />
                ))}
                {savedMeals.map((m) => (
                  <SavedMealRow
                    key={`meal-${m.id}`}
                    item={m}
                    onClick={() => onLogSavedMeal(m.id, m.name)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
