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
  ScanBarcode,
  Star,
  X,
  ChefHat,
  Camera,
  Zap,
  ChevronRight,
} from "lucide-react";
import type { MealType } from "@prisma/client";
import {
  foodSearchUrl,
  mergeFoodSearchResponses,
  type FoodProduct,
  type FoodSearchResponse,
} from "@/lib/food/food-product-types";
import { useDebounce } from "@/hooks/use-debounce";
import { getCached, setCached, isCacheStale } from "@/lib/client-cache";
import { getDefaultQuickAddGrams } from "@/lib/food/portion-presets";
import { FoodQuickRow } from "@/components/nutrition/food-quick-row";
import { SavedMealRow } from "@/components/nutrition/saved-meal-row";
import dynamic from "next/dynamic";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { resetBodyScroll } from "@/lib/scroll-lock";
import {
  FOOD_HISTORY_CACHE_KEY,
  getCachedFoodHistory,
  warmFoodHistoryCache,
  type FoodHistoryPayload,
} from "@/lib/food-history-cache";
import {
  fetchSavedMealTemplates,
  filterSavedMeals,
  getCachedSavedMeals,
  type SavedMealSummary,
} from "@/lib/saved-meals-cache";
import Link from "next/link";

type ViewMode = "hub" | "favorites" | "search";

type Props = {
  open: boolean;
  mealType: MealType;
  favoriteIds: Set<string>;
  initialQuery?: string;
  /** Open directly on favorites / search when deep-linking from More hub. */
  initialView?: ViewMode;
  onClose: () => void;
  onQuickAddFood: (
    product: FoodProduct,
    quantityG: number,
    meal: MealType
  ) => void;
  onToggleFavorite: (foodItemId: string) => Promise<void>;
  onLogSavedMeal?: (recipeId: string, meal: MealType) => Promise<void> | void;
  /** Opens Schnelleintrag (kcal/macros only) for this meal. */
  onQuickEntry?: () => void;
  quickAdding?: boolean;
  onOpenCamera?: () => void;
};

const SEARCH_CACHE_TTL = 300_000;
const SEARCH_DEBOUNCE_MS = 140;

const FoodBarcodeScanner = dynamic(
  () =>
    import("@/components/nutrition/food-barcode-scanner").then(
      (m) => m.FoodBarcodeScanner
    ),
  { ssr: false }
);

const FoodDetailPopup = dynamic(
  () =>
    import("@/components/nutrition/food-detail-popup").then(
      (m) => m.FoodDetailPopup
    ),
  { ssr: false }
);

const FoodManualProductSheet = dynamic(
  () =>
    import("@/components/nutrition/food-manual-product-sheet").then(
      (m) => m.FoodManualProductSheet
    ),
  { ssr: false }
);

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

function fetchFoodSearch(
  trimmed: string,
  signal: AbortSignal,
  phase: "fast" | "enrich"
): Promise<FoodSearchResponse> {
  return fetch(foodSearchUrl(trimmed, phase), {
    credentials: "include",
    signal,
  }).then(async (res) => {
    if (!res.ok) throw new Error("search failed");
    return (await res.json()) as FoodSearchResponse;
  });
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
  initialView,
  onClose,
  onQuickAddFood,
  onToggleFavorite,
  onLogSavedMeal,
  onQuickEntry,
  quickAdding,
  onOpenCamera,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<ViewMode>("hub");
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, SEARCH_DEBOUNCE_MS);
  const [result, setResult] = useState<FoodSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [historyFoods, setHistoryFoods] = useState<FoodHistoryPayload>(() =>
    getCachedFoodHistory() ?? emptyHistory()
  );
  const [savedMeals, setSavedMeals] = useState<SavedMealSummary[]>(
    () => getCachedSavedMeals() ?? []
  );
  const [loggingMealId, setLoggingMealId] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<FoodProduct | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const requestGen = useRef(0);
  const inflightQueryRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (initialQuery.trim()) setView("search");
    else if (initialView === "favorites" || initialView === "search") setView(initialView);
    else setView("hub");
    setQ(initialQuery.trim());
    setDetailProduct(null);
    const cached = getCachedFoodHistory();
    if (cached) applyHistoryPayload(cached, setHistoryFoods);
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, initialQuery, initialView]);

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
        setCached(FOOD_HISTORY_CACHE_KEY, next, 7 * 24 * 60 * 60_000);
        applyHistoryPayload(next, setHistoryFoods);
      })
      .catch(() => {
        if (!getCachedFoodHistory()) setHistoryFoods(emptyHistory());
      });
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const cachedHistory = getCachedFoodHistory();
    if (cachedHistory) {
      applyHistoryPayload(cachedHistory, setHistoryFoods);
      void refreshHistory();
    } else {
      void refreshHistory();
    }
    const cachedMeals = getCachedSavedMeals();
    if (cachedMeals?.length) setSavedMeals(cachedMeals);
    void fetchSavedMealTemplates().then((meals) => {
      if (!cancelled) setSavedMeals(meals);
    });
    return () => {
      cancelled = true;
    };
  }, [open, refreshHistory]);

  const visibleSavedMeals = useMemo(
    () => filterSavedMeals(savedMeals, q).slice(0, 12),
    [savedMeals, q]
  );

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResult(null);
      setLoading(false);
      setEnriching(false);
      inflightQueryRef.current = null;
      abortRef.current?.abort();
      return;
    }

    const key = cacheKey(trimmed);
    const cached = getCached<FoodSearchResponse>(key, { allowStale: true });
    const cacheHasHits = Boolean(cached?.products?.length);
    if (cacheHasHits && cached) {
      setResult(cached);
      setLoading(false);
      if (!isCacheStale(key, 0.75)) {
        abortRef.current?.abort();
        inflightQueryRef.current = null;
        setEnriching(false);
        return;
      }
    } else {
      setLoading(true);
    }

    if (inflightQueryRef.current === trimmed) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    inflightQueryRef.current = trimmed;
    const gen = ++requestGen.current;
    const skipFast = cacheHasHits;
    setEnriching(skipFast);

    try {
      let current = cached;
      if (!skipFast) {
        const fastData = await fetchFoodSearch(trimmed, ac.signal, "fast");
        if (ac.signal.aborted || gen !== requestGen.current) return;
        current = fastData;
        setCached(key, fastData, SEARCH_CACHE_TTL);
        setResult(fastData);
        setLoading(false);
      }

      setEnriching(true);
      const enrichData = await fetchFoodSearch(trimmed, ac.signal, "enrich");
      if (ac.signal.aborted || gen !== requestGen.current) return;
      const merged = current
        ? mergeFoodSearchResponses(current, enrichData)
        : enrichData;
      setCached(key, merged, SEARCH_CACHE_TTL);
      setResult(merged);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
    } finally {
      if (inflightQueryRef.current === trimmed) inflightQueryRef.current = null;
      if (!ac.signal.aborted && gen === requestGen.current) {
        setLoading(false);
        setEnriching(false);
      }
    }
  }, []);

  useEffect(() => {
    if (view === "search") search(debouncedQ);
  }, [debouncedQ, search, view]);

  const isSearching = view === "search" && q.trim().length > 0;
  const queryTooShort = view === "search" && q.trim().length === 1;

  const shortcutFoods = useMemo(() => {
    if (!isSearching) return [];
    return dedupeFoods([
      ...filterFoods(historyFoods.frequent, q.trim()),
      ...filterFoods(historyFoods.recents, q.trim()),
    ]).slice(0, 4);
  }, [isSearching, q, historyFoods.frequent, historyFoods.recents]);

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const shortcutKeys = new Set(
      shortcutFoods.map((f) => f.id ?? f.offCode ?? f.name.toLowerCase())
    );
    const api = (result?.products ?? []).filter((f) => {
      const key = f.id ?? f.offCode ?? f.name.toLowerCase();
      return !shortcutKeys.has(key);
    });
    return api.slice(0, 40);
  }, [isSearching, result, shortcutFoods]);

  /** Favorites — prefer history cache; filter by ids when available */
  const favoriteOnly = useMemo(() => {
    if (historyFoods.favorites.length === 0) return [];
    if (favoriteIds.size === 0) return historyFoods.favorites.slice(0, 40);
    const matched = historyFoods.favorites.filter(
      (f) => f.id && favoriteIds.has(f.id)
    );
    return matched.length > 0 ? matched : historyFoods.favorites.slice(0, 40);
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

  const handleLogSavedMeal = useCallback(
    async (meal: SavedMealSummary) => {
      if (!onLogSavedMeal || loggingMealId) return;
      setLoggingMealId(meal.id);
      void Promise.resolve(onLogSavedMeal(meal.id, mealType)).finally(() => {
        setLoggingMealId(null);
      });
    },
    [onLogSavedMeal, loggingMealId, mealType]
  );

  const renderSavedSection = (meals: SavedMealSummary[]) => {
    if (meals.length === 0 || !onLogSavedMeal) return null;
    return (
      <FoodSection title="Gespeicherte Mahlzeiten">
        {meals.map((meal) => (
          <SavedMealRow
            key={meal.id}
            meal={meal}
            adding={loggingMealId === meal.id || quickAdding}
            onAdd={() => void handleLogSavedMeal(meal)}
          />
        ))}
      </FoodSection>
    );
  };

  const renderRow = (food: FoodProduct) => {
    const rowKey = food.offCode ?? food.id ?? food.name;
    return (
      <FoodQuickRow
        key={rowKey}
        food={food}
        isFavorite={Boolean(food.id && favoriteIds.has(food.id))}
        onQuickAdd={() => void quickAdd(food)}
        onOpenDetail={() => setDetailProduct(food)}
        quickAdding={quickAdding}
        onToggleFavorite={
          food.id ? () => void handleToggleFavorite(food.id as string) : undefined
        }
      />
    );
  };

  if (!mounted || !open) return null;

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
            <div className="food-add-popup-search gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-1.5 px-0.5">
                  Lebensmittel hinzufügen
                </p>
                <input
                  ref={inputRef}
                  type="search"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setView("search");
                  }}
                  onFocus={() => {
                    if (view !== "search") setView("search");
                  }}
                  placeholder="Lebensmittel suchen"
                  className="food-add-popup-input w-full"
                  autoComplete="off"
                  enterKeyHint="search"
                  autoFocus={open}
                  aria-label="Lebensmittel suchen"
                />
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="food-add-popup-icon-btn self-end mb-0.5"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-1 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (view === "favorites") {
                      setView(q.trim() ? "search" : "hub");
                      return;
                    }
                    setView("favorites");
                    setQ("");
                    setResult(null);
                  }}
                  className={`h-11 flex-1 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 ${
                    view === "favorites"
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-white/10 bg-zinc-900/70 text-zinc-300"
                  }`}
                >
                  <Star className="h-3.5 w-3.5" />
                  Favoriten
                </button>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="h-11 flex-1 rounded-xl border border-white/10 bg-zinc-900/70 text-[11px] font-semibold text-zinc-300 flex items-center justify-center gap-1"
                >
                  <ScanBarcode className="h-3.5 w-3.5" />
                  Barcode
                </button>
              </div>
            </div>

            <div className="food-add-popup-scroll">
              {view === "hub" && (
                <div className="space-y-3 px-1 pb-4">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.06]">
                    {onQuickEntry ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          onQuickEntry();
                        }}
                        className="flex w-full min-h-14 items-center gap-3 px-3.5 py-3 text-left active:bg-white/[0.05]"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--nutrition-cal-soft)] text-[var(--nutrition-cal)]">
                          <Zap className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold text-white">
                            Schnelleintrag
                          </span>
                          <span className="block text-xs text-zinc-500 mt-0.5">
                            Nur kcal &amp; Makros — ohne Lebensmittel
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" aria-hidden />
                      </button>
                    ) : null}
                    {onOpenCamera ? (
                      <button
                        type="button"
                        onClick={onOpenCamera}
                        className="flex w-full min-h-14 items-center gap-3 px-3.5 py-3 text-left active:bg-white/[0.05]"
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-zinc-100">
                          <Camera className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold text-white">
                            Foto aufnehmen
                          </span>
                          <span className="block text-xs text-zinc-500 mt-0.5">
                            KI analysiert — du bestätigst
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" aria-hidden />
                      </button>
                    ) : null}
                    <Link
                      href="/rezepte"
                      onClick={handleClose}
                      className="flex w-full min-h-14 items-center gap-3 px-3.5 py-3 text-left active:bg-white/[0.05]"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-zinc-100">
                        <ChefHat className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-white">
                          Rezepte
                        </span>
                        <span className="block text-xs text-zinc-500 mt-0.5">
                          Bibliothek öffnen &amp; loggen
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" aria-hidden />
                    </Link>
                  </div>

                  <FoodSection title="Zuletzt verwendet">
                    {historyFoods.recents.length === 0 ? (
                      <p className="text-sm text-zinc-400 py-3 text-center px-2">
                        Noch keine Lebensmittel — Suche oben starten.
                      </p>
                    ) : (
                      historyFoods.recents.slice(0, 10).map((food) => renderRow(food))
                    )}
                  </FoodSection>
                  {historyFoods.frequent.length > 0 && (
                    <FoodSection title="Häufig verwendet">
                      {historyFoods.frequent.slice(0, 8).map((food) => renderRow(food))}
                    </FoodSection>
                  )}
                  {renderSavedSection(savedMeals.slice(0, 8))}
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
                  {queryTooShort && (
                    <p className="text-sm text-zinc-400 py-6 text-center px-4">
                      Mindestens 2 Zeichen eingeben
                    </p>
                  )}
                  {!q.trim() ? (
                    <div className="space-y-3">
                      {historyFoods.recents.length > 0 && (
                        <FoodSection title="Zuletzt">
                          {historyFoods.recents.slice(0, 8).map((food) => renderRow(food))}
                        </FoodSection>
                      )}
                      {historyFoods.favorites.length > 0 && (
                        <FoodSection title="Favoriten">
                          {historyFoods.favorites.slice(0, 8).map((food) => renderRow(food))}
                        </FoodSection>
                      )}
                      {renderSavedSection(savedMeals.slice(0, 8))}
                      {historyFoods.recents.length === 0 &&
                        historyFoods.favorites.length === 0 && (
                          <p className="text-sm text-zinc-400 py-6 text-center px-4">
                            Suche oben starten — Recent und Favoriten erscheinen hier.
                          </p>
                        )}
                    </div>
                  ) : !queryTooShort ? (
                    <>
                      {renderSavedSection(visibleSavedMeals)}
                      {shortcutFoods.length > 0 && (
                        <FoodSection title="Schnellzugriff">
                          {shortcutFoods.map((food) => renderRow(food))}
                        </FoodSection>
                      )}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1 pb-2 pt-1">
                        Lebensmittel
                      </p>
                      {result?.offError && searchResults.length + shortcutFoods.length > 0 && (
                        <p className="text-[11px] text-amber-300/90 px-1 pb-2">
                          Online-Suche eingeschränkt — lokale Treffer werden angezeigt.
                        </p>
                      )}
                      {searchResults.length === 0 && loading && (
                        <div className="flex gap-2 py-2 px-1">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="h-16 flex-1 rounded-xl bg-zinc-800/60 animate-pulse"
                            />
                          ))}
                        </div>
                      )}
                      {enriching && (
                        <p className="text-[10px] text-zinc-500 text-center pb-2">
                          Weitere Produkte laden…
                        </p>
                      )}
                      {searchResults.length === 0 &&
                        shortcutFoods.length === 0 &&
                        visibleSavedMeals.length === 0 &&
                        !loading && (
                        <p className="text-sm text-zinc-400 py-6 text-center">
                          Keine Treffer — versuche einen anderen Namen.
                        </p>
                      )}
                      {searchResults.map((food) => renderRow(food))}
                    </>
                  ) : null}
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
          adding={quickAdding}
          onClose={() => setDetailProduct(null)}
          onAdd={addFromDetail}
        />
      )}

      {scannerOpen ? (
        <FoodBarcodeScanner
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onProductReady={(p) => setDetailProduct(p)}
          onManualAdd={() => {
            setManualBarcode("");
            setManualOpen(true);
          }}
        />
      ) : null}

      {manualOpen ? (
        <FoodManualProductSheet
          open={manualOpen}
          initialBarcode={manualBarcode}
          onClose={() => setManualOpen(false)}
          onCreated={(p) => setDetailProduct(p)}
        />
      ) : null}
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
