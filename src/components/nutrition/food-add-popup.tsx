"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { MealType } from "@prisma/client";
import type { FoodProduct, FoodSearchResponse } from "@/lib/food/food-product-types";
import { useDebounce } from "@/hooks/use-debounce";
import { getCached, setCached } from "@/lib/client-cache";
import { getDefaultQuickAddGrams } from "@/lib/food/portion-presets";
import { searchStandardDishes } from "@/data/standard-dishes";
import { searchBrandRestaurantFoods } from "@/data/brand-restaurant-foods";
import { searchDachRetailFoods } from "@/data/dach-retail-foods";
import { FoodQuickRow } from "@/components/nutrition/food-quick-row";
import { FoodDetailPopup } from "@/components/nutrition/food-detail-popup";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { resetBodyScroll } from "@/lib/scroll-lock";
import {
  FOOD_HISTORY_CACHE_KEY,
  getCachedFoodHistory,
  warmFoodHistoryCache,
  type FoodHistoryPayload,
} from "@/lib/food-history-cache";

type Props = {
  open: boolean;
  mealType: MealType;
  favoriteIds: Set<string>;
  /** Prefill search (e.g. restaurant dish or photo recognition). */
  initialQuery?: string;
  onClose: () => void;
  onQuickAddFood: (
    product: FoodProduct,
    quantityG: number,
    meal: MealType
  ) => void;
  onToggleFavorite: (foodItemId: string) => Promise<void>;
};

const SEARCH_CACHE_TTL = 300_000;

function emptyHistory(): FoodHistoryPayload {
  return { frequent: [], recents: [], favorites: [] };
}

function applyHistoryPayload(
  d: FoodHistoryPayload,
  setHistoryFoods: (h: FoodHistoryPayload) => void
) {
  setHistoryFoods(d);
}

function cacheKey(q: string) {
  return `food-search:${q.toLowerCase()}`;
}

function filterFoods(foods: FoodProduct[], query: string): FoodProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return foods;
  return foods.filter((f) => f.name.toLowerCase().includes(q));
}

function dedupeFoods(foods: FoodProduct[]): FoodProduct[] {
  const seen = new Set<string>();
  return foods.filter((f) => {
    const key = f.id ?? f.offCode ?? f.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const FoodAddPopup = memo(function FoodAddPopup({
  open,
  mealType,
  favoriteIds,
  initialQuery = "",
  onClose,
  onQuickAddFood,
  onToggleFavorite,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 30);
  const [result, setResult] = useState<FoodSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyFoods, setHistoryFoods] = useState<FoodHistoryPayload>(() =>
    getCachedFoodHistory() ?? emptyHistory()
  );
  const [detailProduct, setDetailProduct] = useState<FoodProduct | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestGen = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ(initialQuery.trim());
    setDetailProduct(null);
    const cached = getCachedFoodHistory();
    if (cached) applyHistoryPayload(cached, setHistoryFoods);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, initialQuery]);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    document.body.dataset.foodAddPopup = "open";
    return () => {
      delete document.body.dataset.foodAddPopup;
    };
  }, [open]);

  const handleClose = useCallback(() => {
    setDetailProduct(null);
    resetBodyScroll();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    // Instant from cache; soft-refresh in background
    const cached = getCachedFoodHistory();
    if (cached) applyHistoryPayload(cached, setHistoryFoods);
    else warmFoodHistoryCache(true);

    let cancelled = false;
    fetch("/api/food/history", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const rec = (d.recents ?? []) as FoodProduct[];
        const next: FoodHistoryPayload = {
          frequent: ((d.frequent ?? rec) as FoodProduct[]).slice(0, 12),
          recents: rec.slice(0, 12),
          favorites: ((d.favorites ?? []) as FoodProduct[]).slice(0, 24),
        };
        setCached(FOOD_HISTORY_CACHE_KEY, next, 180_000);
        applyHistoryPayload(next, setHistoryFoods);
      })
      .catch(() => {
        if (!getCachedFoodHistory()) {
          setHistoryFoods(emptyHistory());
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }

    const key = cacheKey(trimmed);
    const cached = getCached<FoodSearchResponse>(key);
    if (cached) {
      setResult(cached);
      setLoading(false);
    } else {
      // Keep previous/instant results visible — no spinner flash
      setLoading(true);
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const gen = ++requestGen.current;

    try {
      const res = await fetch(
        `/api/food/search?q=${encodeURIComponent(trimmed)}`,
        { signal: ac.signal }
      );
      const data = (await res.json()) as FoodSearchResponse;
      if (!ac.signal.aborted && gen === requestGen.current) {
        setCached(key, data, SEARCH_CACHE_TTL);
        setResult(data);
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
    } finally {
      if (!ac.signal.aborted && gen === requestGen.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    search(debouncedQ);
  }, [debouncedQ, search]);

  const isSearching = q.trim().length > 0;

  const instantResults = useMemo(() => {
    if (!isSearching) return [];
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      return dedupeFoods([
        ...filterFoods(historyFoods.favorites, trimmed),
        ...filterFoods(historyFoods.recents, trimmed),
        ...filterFoods(historyFoods.frequent, trimmed),
        ...searchStandardDishes(trimmed, 8),
      ]);
    }
    return dedupeFoods([
      ...filterFoods(historyFoods.favorites, trimmed),
      ...filterFoods(historyFoods.recents, trimmed),
      ...searchBrandRestaurantFoods(trimmed, 12),
      ...searchDachRetailFoods(trimmed, 12),
      ...searchStandardDishes(trimmed, 10),
    ]);
  }, [isSearching, q, historyFoods]);

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const api = result?.products ?? [];
    // Favorites matching query stay on top
    const favMatches = filterFoods(historyFoods.favorites, q.trim());
    return dedupeFoods([...favMatches, ...instantResults, ...api]).slice(0, 40);
  }, [isSearching, result, instantResults, historyFoods.favorites, q]);

  const quickAdd = useCallback(
    (product: FoodProduct) => {
      const grams = getDefaultQuickAddGrams(product);
      onQuickAddFood(product, grams, mealType);
    },
    [mealType, onQuickAddFood]
  );

  const addFromDetail = useCallback(
    (quantityG: number, m: MealType) => {
      if (!detailProduct) return;
      onQuickAddFood(detailProduct, quantityG, m);
      setDetailProduct(null);
    },
    [detailProduct, onQuickAddFood]
  );

  const renderRow = (food: FoodProduct) => {
    const rowKey = food.offCode ?? food.id ?? food.name;
    return (
      <FoodQuickRow
        key={rowKey}
        food={food}
        isFavorite={Boolean(food.id && favoriteIds.has(food.id))}
        onQuickAdd={() => void quickAdd(food)}
        onOpenDetail={() => setDetailProduct(food)}
        onToggleFavorite={
          food.id ? () => onToggleFavorite(food.id as string) : undefined
        }
      />
    );
  };

  if (!mounted || !open) return null;

  return (
    <>
      {createPortal(
        <div className="food-add-popup-root" role="dialog" aria-modal="true" aria-label="Lebensmittel hinzufügen">
          <div className="food-add-popup-inner">
            <div className="food-add-popup-search">
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Lebensmittel suchen..."
                className="food-add-popup-input"
                autoComplete="off"
                enterKeyHint="search"
                autoFocus
              />
              <button
                type="button"
                onClick={handleClose}
                className="food-add-popup-icon-btn"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="food-add-popup-scroll">
              {!isSearching && (
                <>
                  <FoodSection title="⭐ Favoriten">
                    {historyFoods.favorites.length === 0 ? (
                      <p className="text-sm text-zinc-500 py-3 text-center px-2">
                        Noch keine Favoriten — tippe auf den Stern bei einem Produkt.
                      </p>
                    ) : (
                      historyFoods.favorites.slice(0, 8).map((food) => renderRow(food))
                    )}
                  </FoodSection>
                  <FoodSection title="🕘 Zuletzt verwendet">
                    {historyFoods.recents.length === 0 ? (
                      <p className="text-sm text-zinc-500 py-3 text-center px-2">
                        Noch keine Einträge — suche ein Lebensmittel und füge es hinzu.
                      </p>
                    ) : (
                      historyFoods.recents.slice(0, 8).map((food) => renderRow(food))
                    )}
                  </FoodSection>
                  {historyFoods.frequent.length > 0 && (
                    <FoodSection title="Häufig verwendet">
                      {historyFoods.frequent.slice(0, 8).map((food) => renderRow(food))}
                    </FoodSection>
                  )}
                </>
              )}

              {isSearching && (
                <div className="food-add-popup-results">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 pb-2">
                    Suchergebnisse
                  </p>
                  {searchResults.length === 0 && loading && (
                    <p className="text-sm text-zinc-500 py-6 text-center">Suche…</p>
                  )}
                  {searchResults.length === 0 && !loading && (
                    <p className="text-sm text-zinc-500 py-6 text-center">Keine Treffer</p>
                  )}
                  {searchResults.map((food) => renderRow(food))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {detailProduct && (
        <FoodDetailPopup
          product={detailProduct}
          mealType={mealType}
          onClose={() => setDetailProduct(null)}
          onAdd={addFromDetail}
        />
      )}
    </>
  );
});

function FoodSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="food-add-popup-section">
      <h3 className="food-add-popup-section-title">{title}</h3>
      <div className="divide-y divide-zinc-800/80">{children}</div>
    </section>
  );
}
