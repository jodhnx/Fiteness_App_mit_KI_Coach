"use client";

import { memo, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Star, Plus, ScanLine } from "lucide-react";
import { toast } from "sonner";

export type FoodResult = {
  id: string;
  name: string;
  brand?: string | null;
  category: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingG: number;
};

const CATEGORIES = [
  { id: "", label: "Alle" },
  { id: "MEAT", label: "Fleisch" },
  { id: "FISH", label: "Fisch" },
  { id: "DAIRY", label: "Milch" },
  { id: "VEGETABLES", label: "Gemüse" },
  { id: "FRUIT", label: "Obst" },
  { id: "DRINKS", label: "Getränke" },
  { id: "SWEETS", label: "Süßes" },
  { id: "FAST_FOOD", label: "Fast Food" },
  { id: "FITNESS", label: "Fitness" },
] as const;

type Props = {
  mealType: string;
  favoriteIds: Set<string>;
  onAdd: (foodId: string, quantityG: number) => Promise<void>;
  onToggleFavorite: (foodId: string) => Promise<void>;
  quickFoods?: FoodResult[];
};

export const FoodSearchPanel = memo(function FoodSearchPanel({
  mealType,
  favoriteIds,
  onAdd,
  onToggleFavorite,
  quickFoods = [],
}: Props) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const debouncedQ = useDebounce(q, 200);
  const url = useMemo(() => {
    const p = new URLSearchParams({ limit: "40" });
    if (debouncedQ) p.set("q", debouncedQ);
    if (category) p.set("category", category);
    return `/api/food?${p}`;
  }, [debouncedQ, category]);

  const { data, loading } = useCachedFetch<{ foods: FoodResult[] }>(
    `food-${debouncedQ}-${category}`,
    url,
    30_000
  );
  const foods = data?.foods ?? [];

  async function quickAdd(food: FoodResult, grams?: number) {
    const qty = grams ?? food.servingG;
    await onAdd(food.id, qty);
    toast.success(`${food.name} hinzugefügt`);
  }

  async function lookupBarcode() {
    const raw = window.prompt("Barcode / EAN eingeben:");
    if (!raw) return;
    const code = raw.replace(/\D/g, "");
    if (code.length < 8) {
      toast.error("Ungültiger Barcode");
      return;
    }
    try {
      const res = await fetch(`/api/food/barcode/${code}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Produkt nicht gefunden");
        return;
      }
      const name = data.product?.name ?? data.name;
      if (name) {
        setQ(String(name));
        toast.success(`Gefunden: ${name}`);
      } else {
        toast.message("Produkt gefunden — bitte Menge wählen");
      }
    } catch {
      toast.error("Barcode-Lookup fehlgeschlagen");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Suchen: Hähnchen, Reis, Banane…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 bg-zinc-900/80 border-zinc-700"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Barcode eingeben"
          onClick={() => void lookupBarcode()}
        >
          <ScanLine className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              category === c.id
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "bg-zinc-800/80 text-zinc-400 border border-zinc-700"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {quickFoods.length > 0 && !debouncedQ && (
        <div className="flex flex-wrap gap-2">
          {quickFoods.slice(0, 8).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => quickAdd(f)}
              className="rounded-xl bg-zinc-800/90 border border-zinc-700 px-3 py-2 text-left text-sm hover:border-cyan-500/50 transition-colors"
            >
              <span className="text-white font-medium block truncate max-w-[140px]">{f.name}</span>
              <span className="text-xs text-zinc-500">{Math.round(f.calories)} kcal / {f.servingG}g</span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {loading && <p className="text-sm text-cyan-400/80">Suche…</p>}
        {!loading && foods.length === 0 && (
          <p className="text-sm text-zinc-500">Keine Treffer – anderen Begriff versuchen.</p>
        )}
        {foods.map((food) => (
          <div
            key={food.id}
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{food.name}</p>
              <p className="text-xs text-zinc-500">
                {Math.round(food.calories)} kcal · P {food.proteinG}g · K {food.carbsG}g · F {food.fatG}g · Portion {food.servingG}g
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleFavorite(food.id)}
              className="text-zinc-500 hover:text-amber-400"
            >
              <Star
                className={`h-5 w-5 ${favoriteIds.has(food.id) ? "fill-amber-400 text-amber-400" : ""}`}
              />
            </button>
            <Button size="sm" className="shrink-0" onClick={() => quickAdd(food)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-zinc-600 text-center">Mahlzeit: {mealType} · 1 Klick = Standardportion</p>
    </div>
  );
});
