"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanLine, AlertCircle, Clock, Search } from "lucide-react";
import { toast } from "sonner";
import type { FoodProduct, FoodSearchResponse } from "@/lib/food/food-product-types";
import type { MealType } from "@prisma/client";
import { getCached, setCached } from "@/lib/client-cache";
import { ProductSearchRow } from "@/components/nutrition/product-search-row";
import { ProductDetailModal } from "@/components/nutrition/product-detail-modal";
import { QuickFoodStrip } from "@/components/nutrition/quick-food-strip";
import { getDefaultQuickAddGrams } from "@/lib/food/portion-presets";
const DISH_CHIPS = [
  "Pizza",
  "Döner",
  "Schnitzel",
  "Burger",
  "Pasta",
  "Sushi",
  "Salat",
  "Banane",
];

type Props = {
  mealType: MealType;
  favoriteIds: Set<string>;
  onQuickAddFood: (
    product: FoodProduct,
    quantityG: number,
    meal: MealType
  ) => Promise<void>;
  onToggleFavorite: (foodItemId: string) => Promise<void>;
  quickFoods?: FoodProduct[];
};

const SEARCH_CACHE_TTL = 300_000;
const POPULAR_PRELOAD = ["banane", "haferflocken", "hähnchen", "reis", "joghurt", "pizza"];

function cacheKey(q: string) {
  return `food-search:${q.toLowerCase()}`;
}

export const ProductSearchPanel = memo(function ProductSearchPanel({
  mealType,
  favoriteIds,
  onQuickAddFood,
  onToggleFavorite,
  quickFoods = [],
}: Props) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 80);
  const [result, setResult] = useState<FoodSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOff, setLoadingOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FoodProduct | null>(null);
  const [addMeal, setAddMeal] = useState<MealType>(mealType);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [historyFoods, setHistoryFoods] = useState<{
    favorites: FoodProduct[];
    recents: FoodProduct[];
    frequent: FoodProduct[];
  }>({ favorites: [], recents: [], frequent: [] });
  const [quickAddingId, setQuickAddingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestGen = useRef(0);

  useEffect(() => {
    setAddMeal(mealType);
  }, [mealType]);

  useEffect(() => {
    fetch("/api/food/history")
      .then((r) => r.json())
      .then((d) => {
        setRecentSearches(d.recentSearches ?? []);
        const favs = (d.favorites ?? []) as FoodProduct[];
        const rec = (d.recents ?? []) as FoodProduct[];
        const pinned = favs.filter((f: FoodProduct & { pinned?: boolean }) => f.pinned);
        const unpinned = favs.filter((f: FoodProduct & { pinned?: boolean }) => !f.pinned);
        const frequent = (d.frequent ?? rec) as FoodProduct[];
        setHistoryFoods({
          favorites: [...pinned, ...unpinned],
          recents: rec,
          frequent: frequent.slice(0, 10),
        });
      })
      .catch(() => {});

    for (const term of POPULAR_PRELOAD) {
      if (!getCached<FoodSearchResponse>(cacheKey(term))) {
        fetch(`/api/food/search?q=${encodeURIComponent(term)}&localOnly=1`)
          .then((r) => r.json())
          .then((data) => setCached(cacheKey(term), data, SEARCH_CACHE_TTL))
          .catch(() => {});
      }
    }
  }, []);

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResult(null);
      setLoading(false);
      setLoadingOff(false);
      setError(null);
      return;
    }

    const key = cacheKey(trimmed);
    const cached = getCached<FoodSearchResponse>(key);
    if (cached) {
      setResult(cached);
      setError(cached.offError ?? null);
      setLoading(false);
      setLoadingOff(false);
    } else {
      setLoading(true);
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const gen = ++requestGen.current;

    try {
      const localRes = await fetch(
        `/api/food/search?q=${encodeURIComponent(trimmed)}&localOnly=1`,
        { signal: ac.signal }
      );
      const localData = (await localRes.json()) as FoodSearchResponse;
      if (!ac.signal.aborted && gen === requestGen.current) {
        setResult(localData);
        setLoading(false);
        setLoadingOff(true);
      }

      const fullRes = await fetch(
        `/api/food/search?q=${encodeURIComponent(trimmed)}`,
        { signal: ac.signal }
      );
      const fullData = (await fullRes.json()) as FoodSearchResponse;
      if (!ac.signal.aborted && gen === requestGen.current) {
        setCached(key, fullData, SEARCH_CACHE_TTL);
        setResult(fullData);
        setError(
          fullData.offError && (fullData.products?.length ?? 0) === 0
            ? fullData.offError
            : fullData.offError ?? null
        );
        setLoadingOff(false);
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      if (!cached && gen === requestGen.current) {
        setError(e instanceof Error ? e.message : "Suche fehlgeschlagen");
      }
    } finally {
      if (!ac.signal.aborted && gen === requestGen.current) {
        setLoading(false);
        setLoadingOff(false);
      }
    }
  }, []);

  useEffect(() => {
    search(debouncedQ);
  }, [debouncedQ, search]);

  const products = result?.products ?? [];

  const dishChips = DISH_CHIPS.map((label) => ({ label, query: label }));

  function openProduct(p: FoodProduct) {
    setSelected(p);
    setAddMeal(mealType);
  }

  async function quickAdd(product: FoodProduct) {
    const key = product.id ?? product.offCode ?? product.name;
    const grams = getDefaultQuickAddGrams(product);
    setQuickAddingId(key);
    try {
      await onQuickAddFood(product, grams, mealType);
    } finally {
      setQuickAddingId(null);
    }
  }

  async function addFromModal(quantityG: number, m: MealType) {
    if (!selected) return;
    setAdding(true);
    try {
      await onQuickAddFood(selected, quantityG, m);
      setSelected(null);
    } finally {
      setAdding(false);
    }
  }

  const stripFavorites =
    historyFoods.favorites.length > 0
      ? historyFoods.favorites
      : quickFoods.filter((f) => favoriteIds.has(f.id ?? ""));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Lebensmittel suchen…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10 h-12 text-base bg-zinc-900/80 border-zinc-700"
            autoComplete="off"
            autoFocus
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 shrink-0"
          title="Barcode"
          onClick={async () => {
            const code = window.prompt("EAN / Barcode:");
            if (!code) return;
            setLoading(true);
            try {
              const res = await fetch(`/api/food/barcode/${code.replace(/\D/g, "")}`);
              const d = await res.json();
              if (d.found && d.food) openProduct(d.food);
              else toast.error(d.message ?? "Nicht gefunden");
            } catch {
              toast.error("Barcode-Suche fehlgeschlagen");
            } finally {
              setLoading(false);
            }
          }}
        >
          <ScanLine className="h-4 w-4" />
        </Button>
      </div>

      {!debouncedQ && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {dishChips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setQ(c.query)}
              className="shrink-0 text-xs rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:border-cyan-500/40"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!debouncedQ && (
        <div className="space-y-3">
          <QuickFoodStrip
            title="Favoriten"
            icon="favorites"
            foods={stripFavorites.slice(0, 10)}
            onQuickAdd={quickAdd}
            onOpen={openProduct}
          />
          <QuickFoodStrip
            title="Häufig"
            icon="frequent"
            foods={historyFoods.frequent}
            onQuickAdd={quickAdd}
            onOpen={openProduct}
          />
          <QuickFoodStrip
            title="Zuletzt"
            icon="recent"
            foods={historyFoods.recents.slice(0, 8)}
            onQuickAdd={quickAdd}
            onOpen={openProduct}
          />
        </div>
      )}

      {recentSearches.length > 0 && !debouncedQ && (
        <div className="flex items-center gap-2 flex-wrap">
          <Clock className="h-3.5 w-3.5 text-zinc-600" />
          {recentSearches.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQ(s)}
              className="text-xs text-zinc-500 hover:text-cyan-400"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {loading && debouncedQ.length >= 2 && (
          <p className="text-sm text-cyan-400/80 animate-pulse">Suche lokal…</p>
        )}
        {loadingOff && debouncedQ.length >= 2 && (
          <p className="text-xs text-zinc-600">Erweitere mit Open Food Facts (DACH)…</p>
        )}
        {!loading && debouncedQ.length >= 2 && products.length === 0 && !error && (
          <p className="text-sm text-zinc-500 py-2">Keine Treffer — anderes Stichwort probieren.</p>
        )}
        {products.map((food) => {
          const rowKey = food.offCode ?? food.id ?? food.name;
          return (
            <ProductSearchRow
              key={rowKey}
              food={food}
              isFavorite={Boolean(food.id && favoriteIds.has(food.id))}
              onQuickAdd={() => void quickAdd(food)}
              onDetails={() => openProduct(food)}
              onToggleFavorite={
                food.id ? () => onToggleFavorite(food.id as string) : undefined
              }
              quickAdding={quickAddingId === rowKey}
            />
          );
        })}
      </div>

      {selected && (
        <ProductDetailModal
          product={selected}
          mealType={addMeal}
          onMealTypeChange={setAddMeal}
          favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite}
          onClose={() => setSelected(null)}
          onAdd={addFromModal}
          adding={adding}
        />
      )}

      <p className="text-[10px] text-zinc-600 text-center pt-1">
        ★ Favorit · + Schnell hinzufügen (Standardportion) · DACH-Priorität
      </p>
    </div>
  );
});
