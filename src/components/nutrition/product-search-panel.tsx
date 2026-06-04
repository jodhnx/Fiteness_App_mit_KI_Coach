"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanLine, AlertCircle, Clock, Search } from "lucide-react";
import { toast } from "sonner";
import type { FoodProduct, FoodSearchResponse } from "@/lib/food/food-product-types";
import type { MealType } from "@prisma/client";
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";
import { getCached, setCached } from "@/lib/client-cache";
import { ensureFoodItemId } from "@/lib/ensure-food-id";
import { ProductSearchRow } from "@/components/nutrition/product-search-row";
import { ProductDetailModal } from "@/components/nutrition/product-detail-modal";
import { QuickFoodStrip } from "@/components/nutrition/quick-food-strip";

type Props = {
  mealType: MealType;
  favoriteIds: Set<string>;
  onAdd: (
    foodItemId: string,
    quantityG: number,
    options?: { offCode?: string; mealType?: MealType }
  ) => Promise<void>;
  onToggleFavorite: (foodItemId: string) => Promise<void>;
  quickFoods?: FoodProduct[];
};

const SEARCH_CACHE_TTL = 120_000;

export const ProductSearchPanel = memo(function ProductSearchPanel({
  mealType,
  favoriteIds,
  onAdd,
  onToggleFavorite,
  quickFoods = [],
}: Props) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 150);
  const [result, setResult] = useState<FoodSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FoodProduct | null>(null);
  const [grams, setGrams] = useState("100");
  const [addMeal, setAddMeal] = useState<MealType>(mealType);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [historyFoods, setHistoryFoods] = useState<{
    favorites: FoodProduct[];
    recents: FoodProduct[];
    frequent: FoodProduct[];
  }>({ favorites: [], recents: [], frequent: [] });
  const [adding, setAdding] = useState(false);
  const [quickAddingId, setQuickAddingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
          frequent: frequent.slice(0, 8),
        });
      })
      .catch(() => {});
  }, []);

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResult(null);
      setLoading(false);
      setError(null);
      return;
    }

    const cacheKey = `food-search:${trimmed.toLowerCase()}`;
    const cached = getCached<FoodSearchResponse>(cacheKey);
    if (cached) {
      setResult(cached);
      setError(cached.offError ?? null);
      setLoading(false);
    } else {
      setLoading(true);
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const params = new URLSearchParams({ q: trimmed, suggestions: "1" });
      const res = await fetch(`/api/food/search?${params}`, {
        signal: ac.signal,
      });
      const data = (await res.json()) as FoodSearchResponse;
      if (!res.ok) {
        const errBody = data as { error?: string };
        throw new Error(errBody.error ?? `Suche fehlgeschlagen (${res.status})`);
      }
      setCached(cacheKey, data, SEARCH_CACHE_TTL);
      setResult(data);
      setError(
        data.offError && (data.products?.length ?? 0) === 0 ? data.offError : data.offError ?? null
      );
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Produktsuche nicht erreichbar";
      if (!cached) {
        setError(msg);
        setResult({
          products: [],
          suggestions: [],
          query: trimmed,
          source: "local",
          offAvailable: false,
          offError: msg,
          localCount: 0,
          offCount: 0,
        });
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQ);
  }, [debouncedQ, search]);

  const products = result?.products ?? [];
  const suggestions = useMemo(() => {
    const s = result?.suggestions ?? [];
    return s.filter((x) => x.toLowerCase() !== debouncedQ.toLowerCase());
  }, [result?.suggestions, debouncedQ]);

  function openProduct(p: FoodProduct) {
    setSelected(p);
    setGrams("100");
    setAddMeal(mealType);
  }

  async function addProduct(
    product: FoodProduct,
    quantityG: number,
    targetMeal: MealType = mealType
  ) {
    if (!quantityG || quantityG <= 0) {
      toast.error("Bitte gültige Gramm-Menge eingeben");
      return;
    }
    setAdding(true);
    try {
      const resolved = await ensureFoodItemId(product);
      if ("error" in resolved) {
        toast.error(resolved.error);
        return;
      }
      await onAdd(resolved.id, quantityG, {
        offCode: product.offCode,
        mealType: targetMeal,
      });
      toast.success(`${product.name} zu ${MEAL_TYPE_LABELS[targetMeal]} hinzugefügt`);
      setSelected(null);
    } finally {
      setAdding(false);
      setQuickAddingId(null);
    }
  }

  async function quickAdd100g(product: FoodProduct) {
    const key = product.id ?? product.offCode ?? product.name;
    setQuickAddingId(key);
    await addProduct(product, 100, mealType);
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
            className="pl-10 bg-zinc-900/80 border-zinc-700"
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Barcode eingeben"
          onClick={async () => {
            const code = window.prompt("EAN / Barcode eingeben:");
            if (!code) return;
            setLoading(true);
            try {
              const res = await fetch(`/api/food/barcode/${code.replace(/\D/g, "")}`);
              const d = await res.json();
              if (d.found && d.food) openProduct(d.food);
              else toast.error(d.message ?? "Produkt nicht gefunden");
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

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {error}
            {(result?.localCount ?? 0) > 0
              ? ` (${result?.localCount ?? 0} lokale Treffer)`
              : ""}
          </span>
        </div>
      )}

      {!debouncedQ && (
        <div className="space-y-3">
          <QuickFoodStrip
            title="Favoriten"
            icon="favorites"
            foods={stripFavorites.slice(0, 10)}
            onQuickAdd={quickAdd100g}
            onOpen={openProduct}
          />
          <QuickFoodStrip
            title="Häufig verwendet"
            icon="frequent"
            foods={historyFoods.frequent}
            onQuickAdd={quickAdd100g}
            onOpen={openProduct}
          />
          <QuickFoodStrip
            title="Zuletzt verwendet"
            icon="recent"
            foods={historyFoods.recents.slice(0, 8)}
            onQuickAdd={quickAdd100g}
            onOpen={openProduct}
          />
        </div>
      )}

      {suggestions.length > 0 && debouncedQ.length < 2 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQ(s)}
              className="text-xs rounded-full bg-zinc-800 border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:border-cyan-500/40"
            >
              {s}
            </button>
          ))}
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

      {suggestions.length > 0 && debouncedQ.length >= 2 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQ(s)}
              className="text-xs rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 text-cyan-200"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {loading && debouncedQ.length >= 2 && (
          <p className="text-sm text-cyan-400/80">Suche…</p>
        )}
        {!loading && debouncedQ.length >= 2 && products.length === 0 && !error && (
          <p className="text-sm text-zinc-500">Keine Produkte gefunden.</p>
        )}
        {products.map((food) => {
          const rowKey = food.offCode ?? food.id ?? food.name;
          return (
            <ProductSearchRow
              key={rowKey}
              food={food}
              isFavorite={Boolean(food.id && favoriteIds.has(food.id))}
              onQuickAdd={() => quickAdd100g(food)}
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
          grams={grams}
          onGramsChange={setGrams}
          mealType={addMeal}
          onMealTypeChange={setAddMeal}
          favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite}
          onClose={() => setSelected(null)}
          onAdd={(quantityG, m) => addProduct(selected, quantityG, m)}
          adding={adding}
        />
      )}

      <p className="text-[10px] text-zinc-600 text-center">
        + = 100 g zu {MEAL_TYPE_LABELS[mealType]} · Open Food Facts
      </p>
    </div>
  );
});
