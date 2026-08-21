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
import {
  ArrowLeft,
  ChevronRight,
  ScanBarcode,
  Search,
  Star,
  X,
} from "lucide-react";
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
import { FoodBarcodeScanner } from "@/components/nutrition/food-barcode-scanner";
import { FoodManualProductSheet } from "@/components/nutrition/food-manual-product-sheet";
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
  initialQuery?: string;
  onClose: () => void;
  onQuickAddFood: (
    product: FoodProduct,
    quantityG: number,
    meal: MealType
  ) => void;
  onToggleFavorite: (foodItemId: string) => Promise<void>;
};

type ViewMode = "hub" | "favorites" | "search";

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
  const [view, setView] = useState<ViewMode>("hub");
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 30);
  const [result, setResult] = useState<FoodSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyFoods, setHistoryFoods] = useState<FoodHistoryPayload>(() =>
    getCachedFoodHistory() ?? emptyHistory()
  );
  const [detailProduct, setDetailProduct] = useState<FoodProduct | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const requestGen = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setView(initialQuery.trim() ? "search" : "hub");
    setQ(initialQuery.trim());
    setDetailProduct(null);
    const cached = getCachedFoodHistory();
    if (cached) applyHistoryPayload(cached, setHistoryFoods);
    const t = window.setTimeout(() => {
      if (initialQuery.trim()) inputRef.current?.focus();
    }, 0);
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
    setView("hub");
    setQ("");
    resetBodyScroll();
    onClose();
  }, [onClose]);

  const refreshHistory = useCallback(() => {
    const cached = getCachedFoodHistory();
    if (cached) applyHistoryPayload(cached, setHistoryFoods);
    else warmFoodHistoryCache(true);

    return fetch("/api/food/history", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        const rec = (d.recents ?? []) as FoodProduct[];
        const next: FoodHistoryPayload = {
          frequent: ((d.frequent ?? rec) as FoodProduct[]).slice(0, 12),
          recents: rec.slice(0, 12),
          favorites: ((d.favorites ?? []) as FoodProduct[]).slice(0, 40),
        };
        setCached(FOOD_HISTORY_CACHE_KEY, next, 180_000);
        applyHistoryPayload(next, setHistoryFoods);
      })
      .catch(() => {
        if (!getCachedFoodHistory()) setHistoryFoods(emptyHistory());
      });
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void refreshHistory().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [open, refreshHistory]);

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
    if (view === "search") search(debouncedQ);
  }, [debouncedQ, search, view]);

  const isSearching = view === "search" && q.trim().length > 0;

  const instantResults = useMemo(() => {
    if (!isSearching) return [];
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      return dedupeFoods([
        ...filterFoods(historyFoods.recents, trimmed),
        ...searchStandardDishes(trimmed, 8),
      ]);
    }
    return dedupeFoods([
      ...filterFoods(historyFoods.recents, trimmed),
      ...searchBrandRestaurantFoods(trimmed, 12),
      ...searchDachRetailFoods(trimmed, 12),
      ...searchStandardDishes(trimmed, 10),
    ]);
  }, [isSearching, q, historyFoods.recents]);

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const api = result?.products ?? [];
    return dedupeFoods([...instantResults, ...api]).slice(0, 40);
  }, [isSearching, result, instantResults]);

  /** Favorites only — never mix with recents */
  const favoriteOnly = useMemo(() => {
    return historyFoods.favorites.filter(
      (f) => f.id && favoriteIds.has(f.id)
    );
  }, [historyFoods.favorites, favoriteIds]);

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

  const handleToggleFavorite = useCallback(
    async (foodItemId: string) => {
      const wasFav = favoriteIds.has(foodItemId);
      await onToggleFavorite(foodItemId);
      if (wasFav) {
        setHistoryFoods((prev) => ({
          ...prev,
          favorites: prev.favorites.filter((f) => f.id !== foodItemId),
        }));
      }
      void refreshHistory();
    },
    [favoriteIds, onToggleFavorite, refreshHistory]
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
          food.id ? () => void handleToggleFavorite(food.id as string) : undefined
        }
      />
    );
  };

  if (!mounted || !open) return null;

  const headerTitle =
    view === "favorites"
      ? "⭐ Favoriten"
      : view === "search"
        ? "Lebensmittel suchen"
        : "Lebensmittel hinzufügen";

  return (
    <>
      {createPortal(
        <div
          className="food-add-popup-root"
          role="dialog"
          aria-modal="true"
          aria-label="Lebensmittel hinzufügen"
        >
          <div className="food-add-popup-inner">
            <div className="food-add-popup-search">
              {view !== "hub" ? (
                <button
                  type="button"
                  onClick={() => {
                    setView("hub");
                    setQ("");
                    setResult(null);
                  }}
                  className="food-add-popup-icon-btn"
                  aria-label="Zurück"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              ) : null}
              {view === "search" ? (
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
              ) : (
                <p className="flex-1 text-sm font-bold text-white px-1 truncate">
                  {headerTitle}
                </p>
              )}
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
              {view === "hub" && (
                <div className="space-y-3 px-1 pb-4">
                  <FoodSection title="🕘 Zuletzt verwendet">
                    {historyFoods.recents.length === 0 ? (
                      <p className="text-sm text-zinc-500 py-3 text-center px-2">
                        Noch keine Einträge — suche ein Lebensmittel und füge es hinzu.
                      </p>
                    ) : (
                      historyFoods.recents.slice(0, 10).map((food) => renderRow(food))
                    )}
                  </FoodSection>

                  <button
                    type="button"
                    onClick={() => setView("favorites")}
                    className="w-full flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3.5 text-left active:scale-[0.99]"
                  >
                    <Star className="h-5 w-5 text-amber-400 fill-amber-400/30" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">⭐ Favoriten</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {favoriteOnly.length > 0
                          ? `${favoriteOnly.length} gespeichert`
                          : "Eigene Favoritenliste öffnen"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setView("search");
                      window.setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className="w-full flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-zinc-900/70 px-4 py-3.5 text-left active:scale-[0.99]"
                  >
                    <Search className="h-5 w-5 text-accent" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">🔎 Lebensmittel suchen</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Datenbank · Marken · Händler
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="w-full flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-zinc-900/70 px-4 py-3.5 text-left active:scale-[0.99]"
                  >
                    <ScanBarcode className="h-5 w-5 text-violet-400" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">📷 Barcode scannen</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        EAN erkennen und hinzufügen
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  </button>
                </div>
              )}

              {view === "favorites" && (
                <div className="food-add-popup-results">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 pb-2">
                    Nur deine Favoriten
                  </p>
                  {favoriteOnly.length === 0 ? (
                    <p className="text-sm text-zinc-500 py-8 text-center px-4">
                      Noch keine Favoriten. Tippe in der Suche auf den Stern bei einem
                      Produkt.
                    </p>
                  ) : (
                    favoriteOnly.map((food) => renderRow(food))
                  )}
                </div>
              )}

              {view === "search" && (
                <div className="food-add-popup-results">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 pb-2">
                    Suchergebnisse
                  </p>
                  {!isSearching && (
                    <p className="text-sm text-zinc-500 py-6 text-center">
                      Tippe mindestens 2 Zeichen…
                    </p>
                  )}
                  {isSearching && searchResults.length === 0 && loading && (
                    <p className="text-sm text-zinc-500 py-6 text-center">Suche…</p>
                  )}
                  {isSearching && searchResults.length === 0 && !loading && (
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

      <FoodBarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onProductReady={(p) => setDetailProduct(p)}
        onManualAdd={() => {
          setManualBarcode("");
          setManualOpen(true);
        }}
      />

      <FoodManualProductSheet
        open={manualOpen}
        initialBarcode={manualBarcode}
        onClose={() => setManualOpen(false)}
        onCreated={(p) => setDetailProduct(p)}
      />
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
