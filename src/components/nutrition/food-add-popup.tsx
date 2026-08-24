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
} from "lucide-react";
import type { MealType } from "@prisma/client";
import type { FoodProduct, FoodSearchResponse } from "@/lib/food/food-product-types";
import { useDebounce } from "@/hooks/use-debounce";
import { getCached, setCached } from "@/lib/client-cache";
import { getDefaultQuickAddGrams } from "@/lib/food/portion-presets";
import { FoodQuickRow } from "@/components/nutrition/food-quick-row";
import { FoodDetailPopup } from "@/components/nutrition/food-detail-popup";
import { FoodManualProductSheet } from "@/components/nutrition/food-manual-product-sheet";
import dynamic from "next/dynamic";
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
  quickAdding?: boolean;
};

type ViewMode = "hub" | "favorites" | "search";

const SEARCH_CACHE_TTL = 300_000;
const SEARCH_DEBOUNCE_MS = 140;
const DISH_CHIPS = [
  "Pizza",
  "Döner",
  "Schnitzel",
  "Burger",
  "Pasta",
  "Salat",
  "Banane",
];

const FoodBarcodeScanner = dynamic(
  () =>
    import("@/components/nutrition/food-barcode-scanner").then(
      (m) => m.FoodBarcodeScanner
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
  quickAdding,
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
      setEnriching(false);
      return;
    }

    const key = cacheKey(trimmed);
    const cached = getCached<FoodSearchResponse>(key, { allowStale: true });
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
      // Phase 1: local-only (fast) — paint ASAP
      const localRes = await fetch(
        `/api/food/search?q=${encodeURIComponent(trimmed)}&localOnly=1`,
        { signal: ac.signal }
      );
      const localData = (await localRes.json()) as FoodSearchResponse;
      if (!ac.signal.aborted && gen === requestGen.current) {
        setResult(localData);
        setLoading(false);
        if (localData.products?.length) {
          setCached(key, localData, SEARCH_CACHE_TTL);
        }
      }

      // Phase 2: full merge (may include OFF) — upgrade results
      setEnriching(true);
      const fullRes = await fetch(
        `/api/food/search?q=${encodeURIComponent(trimmed)}`,
        { signal: ac.signal }
      );
      const fullData = (await fullRes.json()) as FoodSearchResponse;
      if (!ac.signal.aborted && gen === requestGen.current) {
        setCached(key, fullData, SEARCH_CACHE_TTL);
        setResult(fullData);
        setEnriching(false);
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
    } finally {
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
              <p className="flex-1 text-sm font-bold text-white px-1 truncate min-w-0">
                Lebensmittel hinzufügen
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="food-add-popup-icon-btn"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-1 pb-2 space-y-2">
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setView("search");
                }}
                onFocus={() => {
                  if (view === "favorites") setView("search");
                  else if (view !== "search") setView("search");
                }}
                placeholder="🔍 Lebensmittel suchen..."
                className="food-add-popup-input w-full"
                autoComplete="off"
                enterKeyHint="search"
                autoFocus={open}
              />
              <div className="grid grid-cols-2 gap-2">
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
                  className={`h-10 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                    view === "favorites"
                      ? "border-amber-400/40 bg-amber-500/20 text-amber-50"
                      : "border-amber-500/25 bg-amber-500/10 text-amber-100"
                  }`}
                >
                  <Star className="h-3.5 w-3.5 fill-amber-400/40 text-amber-400" />
                  Favoriten
                </button>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="h-10 rounded-xl border border-zinc-700/80 bg-zinc-900/60 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <ScanBarcode className="h-3.5 w-3.5 text-violet-400" />
                  Barcode
                </button>
              </div>
            </div>

            <div className="food-add-popup-scroll">
              {view === "hub" && (
                <div className="space-y-2 px-1 pb-4">
                  {historyFoods.frequent.length > 0 && (
                    <FoodSection title="⚡ Häufig verwendet">
                      {historyFoods.frequent.slice(0, 8).map((food) => renderRow(food))}
                    </FoodSection>
                  )}
                  <FoodSection title="🕘 Zuletzt verwendet">
                    {historyFoods.recents.length === 0 ? (
                      <p className="text-sm text-zinc-400 py-3 text-center px-2">
                        Noch keine Lebensmittel verwendet. Suche oben starten.
                      </p>
                    ) : (
                      historyFoods.recents.slice(0, 10).map((food) => renderRow(food))
                    )}
                  </FoodSection>
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
                      <div className="flex flex-wrap gap-2 px-1">
                        {DISH_CHIPS.map((label) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              setQ(label);
                              setView("search");
                            }}
                            className="min-h-11 rounded-xl border border-white/10 bg-zinc-900/70 px-3 text-xs font-semibold text-zinc-200"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <FoodSection title="🕘 Zuletzt verwendet">
                        {historyFoods.recents.length === 0 ? (
                          <p className="text-sm text-zinc-400 py-3 text-center px-2">
                            Noch keine Lebensmittel verwendet.
                          </p>
                        ) : (
                          historyFoods.recents.slice(0, 8).map((food) => renderRow(food))
                        )}
                      </FoodSection>
                    </div>
                  ) : !queryTooShort ? (
                    <>
                      {shortcutFoods.length > 0 && (
                        <FoodSection title="Schnellzugriff">
                          {shortcutFoods.map((food) => renderRow(food))}
                        </FoodSection>
                      )}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1 pb-2 pt-1">
                        Suchergebnisse
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
                      {searchResults.length === 0 && shortcutFoods.length === 0 && !loading && (
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
