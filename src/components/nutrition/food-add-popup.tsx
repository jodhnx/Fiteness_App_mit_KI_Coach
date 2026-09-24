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
  ChevronLeft,
  ChevronRight,
  Camera,
} from "lucide-react";
import type { MealType } from "@prisma/client";
import { TRACK_MEAL_ORDER, MEAL_TYPE_LABELS } from "@/lib/meal-types";
import {
  foodSearchUrl,
  mergeFoodSearchResponses,
  shouldApplySearchResult,
  type FoodProduct,
  type FoodSearchResponse,
} from "@/lib/food/food-product-types";
import { rankFoodSearchResults } from "@/lib/food/food-search-rank";
import { useDebounce } from "@/hooks/use-debounce";
import { getCached, setCached, isCacheStale, fetchCached } from "@/lib/client-cache";
import { getDefaultQuickAddGrams } from "@/lib/food/portion-presets";
import { FoodQuickRow } from "@/components/nutrition/food-quick-row";
import { SavedMealRow } from "@/components/nutrition/saved-meal-row";
import dynamic from "next/dynamic";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { resetBodyScroll } from "@/lib/scroll-lock";
import {
  FOOD_HISTORY_CACHE_KEY,
  getCachedFoodHistory,
  type FoodHistoryPayload,
} from "@/lib/food-history-cache";
import {
  fetchSavedMealTemplates,
  filterSavedMeals,
  getCachedSavedMeals,
  type SavedMealSummary,
} from "@/lib/saved-meals-cache";

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
  quickAdding?: boolean;
  /** Shown with back chevron; same action as close (e.g. return to Mehr). */
  backLabel?: string;
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
  phase: "fast" | "enrich" | "full"
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
  quickAdding,
  backLabel,
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
  const [activeMeal, setActiveMeal] = useState<MealType>(mealType);
  const abortRef = useRef<AbortController | null>(null);
  const requestGen = useRef(0);
  const inflightQueryRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setActiveMeal(mealType);
    if (initialQuery.trim()) setView("search");
    else if (initialView === "favorites" || initialView === "search") setView(initialView);
    else setView("hub");
    setQ(initialQuery.trim());
    setDetailProduct(null);
    const cached = getCachedFoodHistory();
    if (cached) applyHistoryPayload(cached, setHistoryFoods);
    // Avoid autofocus on deep-link/favorites — keyboard steals the first taps (X needs 2–3 clicks).
    const shouldFocus =
      Boolean(initialQuery.trim()) || initialView === "search";
    if (!shouldFocus) return;
    const t = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 120);
    return () => window.clearTimeout(t);
  }, [open, initialQuery, initialView, mealType]);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    document.body.dataset.foodAddPopup = "open";
    return () => {
      delete document.body.dataset.foodAddPopup;
    };
  }, [open]);

  const handleClose = useCallback(() => {
    inputRef.current?.blur();
    setDetailProduct(null);
    setView("hub");
    setQ("");
    resetBodyScroll();
    onClose();
  }, [onClose]);

  const refreshHistory = useCallback(() => {
    const cached = getCachedFoodHistory();
    if (cached) applyHistoryPayload(cached, setHistoryFoods);

    // Deduped with warmFoodHistoryCache / other openers via fetchCached.
    return fetchCached(
      FOOD_HISTORY_CACHE_KEY,
      async () => {
        const res = await fetch("/api/food/history", { credentials: "include" });
        if (!res.ok) throw new Error("history failed");
        const d = await res.json();
        const rec = (d.recents ?? []) as FoodProduct[];
        return {
          frequent: ((d.frequent ?? rec) as FoodProduct[]).slice(0, 12),
          recents: rec.slice(0, 12),
          favorites: ((d.favorites ?? []) as FoodProduct[]).slice(0, 40),
        } satisfies FoodHistoryPayload;
      },
      7 * 24 * 60 * 60_000
    )
      .then((next) => {
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
      // Fresh cache → 0 history request; stale → one background refresh.
      if (isCacheStale(FOOD_HISTORY_CACHE_KEY, 0.7)) {
        void refreshHistory();
      }
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
      // Fresh cache → 0 network requests
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
    // Stale → 1 enrich merge; cold → 1 full (local+OFF). Never fast+enrich waterfall.
    const phase: "enrich" | "full" = cacheHasHits ? "enrich" : "full";
    setEnriching(phase === "enrich");

    try {
      const data = await fetchFoodSearch(trimmed, ac.signal, phase);
      if (!shouldApplySearchResult(gen, requestGen.current, ac.signal.aborted)) {
        return;
      }
      const merged =
        phase === "enrich" && cached
          ? mergeFoodSearchResponses(cached, data)
          : {
              ...data,
              products: rankFoodSearchResults(data.products ?? [], trimmed),
            };
      setCached(key, merged, SEARCH_CACHE_TTL);
      setResult(merged);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
    } finally {
      if (inflightQueryRef.current === trimmed) inflightQueryRef.current = null;
      if (shouldApplySearchResult(gen, requestGen.current, ac.signal.aborted)) {
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
      onQuickAddFood(product, grams, activeMeal);
    },
    [activeMeal, onQuickAddFood]
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
      void Promise.resolve(onLogSavedMeal(meal.id, activeMeal)).finally(() => {
        setLoggingMealId(null);
      });
    },
    [onLogSavedMeal, loggingMealId, activeMeal]
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
          aria-label="Essen eintragen"
        >
          <div className="food-add-popup-inner">
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClose();
                }}
                className="food-add-popup-icon-btn relative z-20 touch-manipulation"
                aria-label={backLabel ? `Zurück zu ${backLabel}` : "Zurück"}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="flex-1 text-center text-[17px] font-bold text-zinc-900 dark:text-white truncate">
                Essen eintragen
              </h1>
              <button
                type="button"
                onClick={() => {
                  setManualBarcode("");
                  setManualOpen(true);
                }}
                className="shrink-0 min-h-11 px-2 text-[13px] font-semibold text-teal-400 active:opacity-80"
              >
                + Eigene
              </button>
            </div>

            <div className="px-3 pb-2">
              <div className="relative flex items-center gap-2">
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
                  placeholder="Lebensmittel, Marke oder Rezept…"
                  className="food-add-popup-input w-full pr-12"
                  autoComplete="off"
                  enterKeyHint="search"
                  autoFocus={false}
                  aria-label="Lebensmittel suchen"
                />
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-orange-400 active:opacity-80"
                  aria-label="Barcode scannen"
                >
                  <ScanBarcode className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="px-3 pb-2">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {TRACK_MEAL_ORDER.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setActiveMeal(m)}
                    className={`shrink-0 h-9 rounded-full px-3.5 text-[12px] font-semibold transition-colors ${
                      activeMeal === m
                        ? "bg-[var(--accent,#6d5dfe)] text-white"
                        : "bg-zinc-100 text-zinc-600 dark:bg-[#1a1a21] dark:text-zinc-400 dark:border dark:border-white/[0.06]"
                    }`}
                  >
                    {MEAL_TYPE_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-3 pb-2">
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="flex w-full items-center gap-3 rounded-[1rem] border border-zinc-200/90 bg-white px-3.5 py-3 text-left shadow-sm active:opacity-90 dark:border-white/[0.07] dark:bg-[#1a1a21] dark:shadow-none"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-500/40 text-orange-400">
                  <Camera className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-zinc-900 dark:text-white">
                    Barcode scannen
                  </span>
                  <span className="block text-[12px] text-zinc-500 mt-0.5">
                    Nährwerte sekundenschnell erfassen
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden />
              </button>
            </div>

            <div className="px-3 pb-1 flex items-center gap-2">
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
                className={`h-9 flex-1 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 ${
                  view === "favorites"
                    ? "border-accent/30 bg-accent/10 text-accent"
                    : "border-zinc-200 bg-white text-zinc-700 dark:border-white/10 dark:bg-[#1a1a21] dark:text-zinc-300"
                }`}
              >
                <Star className="h-3.5 w-3.5" />
                Favoriten
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClose();
                }}
                className="h-9 w-9 rounded-xl border border-zinc-200 bg-white flex items-center justify-center text-zinc-500 dark:border-white/10 dark:bg-[#1a1a21] dark:text-zinc-400"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="food-add-popup-scroll">
              {view === "hub" && (
                <div className="space-y-3 px-1 pb-4">
                  <FoodSection title="Häufig & Favoriten" actionLabel="Alle ansehen" onAction={() => setView("favorites")}>
                    {(historyFoods.frequent.length > 0
                      ? historyFoods.frequent
                      : favoriteOnly
                    )
                      .slice(0, 8)
                      .map((food) => renderRow(food))}
                    {historyFoods.frequent.length === 0 && favoriteOnly.length === 0 ? (
                      <p className="text-sm text-zinc-400 py-3 text-center px-2">
                        Noch keine Favoriten — Suche oben starten.
                      </p>
                    ) : null}
                  </FoodSection>
                  <FoodSection title="Zuletzt gegessen" actionLabel="Verlauf">
                    {historyFoods.recents.length === 0 ? (
                      <p className="text-sm text-zinc-400 py-3 text-center px-2">
                        Noch keine Lebensmittel — Suche oben starten.
                      </p>
                    ) : (
                      historyFoods.recents.slice(0, 10).map((food) => renderRow(food))
                    )}
                  </FoodSection>
                  {renderSavedSection(savedMeals.slice(0, 8))}
                  <div className="rounded-[1rem] border border-zinc-200/90 bg-white px-3.5 py-3 dark:border-white/[0.07] dark:bg-[#1a1a21]">
                    <p className="text-[13px] text-zinc-600 dark:text-zinc-300">
                      Frage den{" "}
                      <LinkCoach />
                      , um Mahlzeiten per Foto oder Freitext zu tracken!
                    </p>
                  </div>
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
          mealType={activeMeal}
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

function LinkCoach() {
  return (
    <a href="/coach" className="font-semibold text-teal-400">
      KI Coach
    </a>
  );
}

function FoodSection({
  title,
  children,
  actionLabel,
  onAction,
}: {
  title: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <section className="food-add-popup-section">
      <div className="flex items-center justify-between gap-2 mb-1 px-0.5">
        <h3 className="food-add-popup-section-title !mb-0">{title}</h3>
        {actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="text-[12px] font-semibold text-teal-400 active:opacity-80"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="rounded-[1rem] border border-zinc-200/90 bg-white px-3 dark:border-white/[0.07] dark:bg-[#1a1a21] divide-y divide-zinc-100 dark:divide-white/[0.06]">
        {children}
      </div>
    </section>
  );
}
