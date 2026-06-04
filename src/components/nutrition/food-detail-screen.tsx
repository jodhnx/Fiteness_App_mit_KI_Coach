"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { scaleNutrientsForQuantity } from "@/lib/food-extended-nutrients";
import { fmtG, fmtKcal } from "@/lib/format-macros";
import { FavoriteStar } from "@/components/nutrition/favorite-star";

type Props = {
  product: FoodProduct;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onAdd: (quantityG: number) => Promise<void>;
  adding?: boolean;
};

function NutrientRow({ label, value, unit = "g" }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-800/80 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-white font-medium tabular-nums">
        {value}
        {unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}

export function FoodDetailScreen({
  product,
  isFavorite,
  onToggleFavorite,
  onAdd,
  adding,
}: Props) {
  const [grams, setGrams] = useState(
    String(product.servingG && product.servingG !== 100 ? product.servingG : 100)
  );

  const scaled = useMemo(() => {
    const g = parseFloat(grams);
    if (!g || g <= 0) return null;
    return scaleNutrientsForQuantity(product, g);
  }, [grams, product]);

  const ext = scaled?.extended;

  return (
    <div className="flex flex-col min-h-full max-w-lg mx-auto w-full px-4 pb-10 pt-2">
      <div className="card-premium p-5">
        <h2 className="text-xl font-bold text-white leading-tight">{product.name}</h2>
        {product.brand && <p className="text-sm text-zinc-500 mt-1">{product.brand}</p>}
      </div>

      <div className="mt-5">
        <label className="text-sm font-medium text-zinc-400">Portion (Gramm)</label>
        <Input
          type="number"
          inputMode="decimal"
          className="mt-2 h-14 text-2xl font-semibold text-center tabular-nums"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
        />
        <div className="flex gap-2 mt-3">
          {[50, 100, 150, 200].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setGrams(String(v))}
              className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 hover:border-accent active:scale-95"
            >
              {v} g
            </button>
          ))}
        </div>
      </div>

      {scaled && (
        <>
          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Kalorien</p>
            <p className="text-4xl font-bold text-white tabular-nums mt-1">
              {fmtKcal(scaled.macros.calories)}
            </p>
            <p className="text-sm text-zinc-500">kcal</p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {(
              [
                ["Protein", fmtG(scaled.macros.proteinG)],
                ["KH", fmtG(scaled.macros.carbsG)],
                ["Fett", fmtG(scaled.macros.fatG)],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className="card-premium p-3">
                <p className="text-lg font-bold text-white tabular-nums">{v}</p>
                <p className="text-[10px] text-zinc-500 uppercase">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 card-premium p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              Erweiterte Nährwerte
            </p>
            <NutrientRow label="Zucker" value={ext?.sugarG != null ? fmtG(ext.sugarG) : "—"} />
            <NutrientRow label="Ballaststoffe" value={ext?.fiberG != null ? fmtG(ext.fiberG) : "—"} />
            <NutrientRow label="Salz" value={ext?.saltG != null ? fmtG(ext.saltG) : "—"} />
            <NutrientRow
              label="Gesättigte Fette"
              value={ext?.saturatedFatG != null ? fmtG(ext.saturatedFatG) : "—"}
            />
            <NutrientRow
              label="Ungesättigte Fette"
              value={ext?.unsaturatedFatG != null ? fmtG(ext.unsaturatedFatG) : "—"}
            />
            {ext?.potassiumMg != null && (
              <NutrientRow label="Kalium" value={String(ext.potassiumMg)} unit="mg" />
            )}
            {ext?.magnesiumMg != null && (
              <NutrientRow label="Magnesium" value={String(ext.magnesiumMg)} unit="mg" />
            )}
            {ext?.calciumMg != null && (
              <NutrientRow label="Calcium" value={String(ext.calciumMg)} unit="mg" />
            )}
            {ext?.potassiumMg == null && ext?.magnesiumMg == null && ext?.calciumMg == null && (
              <p className="text-xs text-zinc-600 pt-2">Mineralien nur bei vollständigen Produktdaten</p>
            )}
          </div>
        </>
      )}

      <div className="mt-6 flex justify-center">
        <FavoriteStar active={isFavorite} onToggle={onToggleFavorite} size="lg" />
      </div>

      <Button
        className="w-full h-14 text-lg mt-8 rounded-xl btn-accent"
        disabled={adding || !scaled}
        onClick={() => onAdd(parseFloat(grams))}
      >
        {adding ? "Wird hinzugefügt…" : "Hinzufügen"}
      </Button>
    </div>
  );
}
