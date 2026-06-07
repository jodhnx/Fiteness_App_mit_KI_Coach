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
import { FoodQuickRow } from "@/components/nutrition/food-quick-row";
import { FoodDetailPopup } from "@/components/nutrition/food-detail-popup";

type Props = {
  open: boolean;
  mealType: MealType;
  onClose: () => void;
  onQuickAddFood: (
    product: FoodProduct,
    quantityG: number,
    meal: MealType
  ) => Promise<void>;
};

const SEARCH_CACHE_TTL = 300_000;
const FALLBACK_FREQUENT: FoodProduct[] = [
  {
    name: "Whey Protein",
    brand: null,
    calories: 400,
    proteinG: 80,
    carbsG: 8,
    fatG: 6,
    fiberG: 0,
    servingG: 100,
    source: "local",
  },
  {
    name: "Banane",
    brand: null,
    calories: 89,
    proteinG: 1.1,
    carbsG: 23,
    fatG: 0.3,
    fiberG: 2.6,
    servingG: 100,
    source: "local",
  },
  {
    name: "Haferflocken",
    brand: null,
    calories: 379,
    proteinG: 13,
    carbsG: 67,
    fatG: 7,
    fiberG: 10,
    servingG: 100,
    source: "local",
  },
  {
    name: "Hähnchenbrust",
    brand: null,
    calories: 165,
    proteinG: 31,
    carbsG: 0,
    fatG: 3.6,
    fiberG: 0,
    servingG: 100,
    source: "local",
  },
  {
    name: "Reis",
    brand: null,
    calories: 130,
    proteinG: 2.7,
    carbsG: 28,
    fatG: 0.3,
    fiberG: 0.4,
    servingG: 100,
    source: "local",
  },
];

const FALLBACK_RECENT: FoodProduct[] = [
  {
    name: "Pizza Salami",
    brand: "Standardgericht",
    calories: 290,
    proteinG: 12,
    carbsG: 30,
    fatG: 14,
    fiberG: 2,
    servingG: 350,
    source: "local",
  },
  {
    name: "Protein Pudding",
    brand: null,
    calories: 75,
    proteinG: 10,
    carbsG: 6,
    fatG: 1,
    fiberG: 0,
    servingG: 150,
    source: "local",
  },
  {
    name: "Skyr",
    brand: null,
    calories: 63,
    proteinG: 11,
    carbsG: 4,
    fatG: 0.2,
    fiberG: 0,
    servingG: 150,
    source: "local",
  },
  {
    name: "Ei",
    brand: null,
    calories: 155,
    proteinG: 13,
    carbsG: 1.1,
    fatG: 11,
    fiberG: 0,
    servingG: 100,
    source: "local",
  },
];

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
  onClose,
  onQuickAddFood,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 60);
  const [result, setResult] = useState<FoodSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyFoods, setHistoryFoods] = useState<{
    frequent: FoodProduct[];
    recents: FoodProduct[];
  }>({ frequent: [], recents: [] });
  const [detailProduct, setDetailProduct] = useState<FoodProduct | null>(null);
  const [quickAddingId, setQuickAddingId] = useState<string | null>(null);
  const [addingDetail, setAddingDetail] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestGen = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setDetailProduct(null);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.foodAddPopup = "open";
    return () => {
      document.body.style.overflow = prev;
      delete document.body.dataset.foodAddPopup;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/food/history")
      .then((r) => r.json())
      .then((d) => {
        const rec = (d.recents ?? []) as FoodProduct[];
        const frequent = ((d.frequent ?? rec) as FoodProduct[]).slice(0, 8);
        setHistoryFoods({
          frequent: frequent.length > 0 ? frequent : FALLBACK_FREQUENT,
          recents: rec.length > 0 ? rec.slice(0, 8) : FALLBACK_RECENT,
        });
      })
      .catch(() => {
        setHistoryFoods({ frequent: FALLBACK_FREQUENT, recents: FALLBACK_RECENT });
      });
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
      }

      const fullRes = await fetch(
        `/api/food/search?q=${encodeURIComponent(trimmed)}`,
        { signal: ac.signal }
      );
      const fullData = (await fullRes.json()) as FoodSearchResponse;
      if (!ac.signal.aborted && gen === requestGen.current) {
        setCached(key, fullData, SEARCH_CACHE_TTL);
        setResult(fullData);
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

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      const local = [
        ...filterFoods(historyFoods.frequent, trimmed),
        ...filterFoods(historyFoods.recents, trimmed),
        ...searchStandardDishes(trimmed, 8),
      ];
      return dedupeFoods(local);
    }
    return result?.products ?? [];
  }, [isSearching, q, historyFoods, result]);

  const quickAdd = useCallback(
    async (product: FoodProduct) => {
      const key = product.id ?? product.offCode ?? product.name;
      const grams = getDefaultQuickAddGrams(product);
      setQuickAddingId(key);
      try {
        await onQuickAddFood(product, grams, mealType);
      } finally {
        setQuickAddingId(null);
      }
    },
    [mealType, onQuickAddFood]
  );

  const addFromDetail = useCallback(
    async (quantityG: number, m: MealType) => {
      if (!detailProduct) return;
      setAddingDetail(true);
      try {
        await onQuickAddFood(detailProduct, quantityG, m);
        setDetailProduct(null);
      } finally {
        setAddingDetail(false);
      }
    },
    [detailProduct, onQuickAddFood]
  );

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
                onClick={onClose}
                className="food-add-popup-icon-btn"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="food-add-popup-scroll">
              {!isSearching && (
                <>
                  <FoodSection title="Häufig verwendet">
                    {historyFoods.frequent.map((food) => (
                      <FoodQuickRow
                        key={food.id ?? food.name}
                        food={food}
                        onQuickAdd={() => void quickAdd(food)}
                        onOpenDetail={() => setDetailProduct(food)}
                        quickAdding={quickAddingId === (food.id ?? food.name)}
                      />
                    ))}
                  </FoodSection>

                  <FoodSection title="Zuletzt verwendet">
                    {historyFoods.recents.map((food) => (
                      <FoodQuickRow
                        key={food.id ?? food.name}
                        food={food}
                        onQuickAdd={() => void quickAdd(food)}
                        onOpenDetail={() => setDetailProduct(food)}
                        quickAdding={quickAddingId === (food.id ?? food.name)}
                      />
                    ))}
                  </FoodSection>
                </>
              )}

              {isSearching && (
                <div className="food-add-popup-results">
                  {loading && debouncedQ.trim().length >= 2 && searchResults.length === 0 && (
                    <p className="text-sm text-zinc-500 py-6 text-center">Suche…</p>
                  )}
                  {!loading && searchResults.length === 0 && (
                    <p className="text-sm text-zinc-500 py-6 text-center">Keine Treffer</p>
                  )}
                  {searchResults.map((food) => {
                    const rowKey = food.offCode ?? food.id ?? food.name;
                    return (
                      <FoodQuickRow
                        key={rowKey}
                        food={food}
                        onQuickAdd={() => void quickAdd(food)}
                        onOpenDetail={() => setDetailProduct(food)}
                        quickAdding={quickAddingId === rowKey}
                      />
                    );
                  })}
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
          adding={addingDetail}
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
