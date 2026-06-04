"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { macrosForQuantity } from "@/lib/food-macros";
import { productToMacroSource } from "@/lib/food-per-100g";
import { fmtG, fmtKcal } from "@/lib/format-macros";

type Props = {
  product: FoodProduct;
  onAdd: (quantityG: number) => Promise<void>;
  adding?: boolean;
};

export function FoodAddConfirm({ product, onAdd, adding }: Props) {
  const [grams, setGrams] = useState(
    String(product.servingG && product.servingG !== 100 ? product.servingG : 100)
  );

  const macros = useMemo(() => {
    const g = parseFloat(grams);
    if (!g || g <= 0) return null;
    return macrosForQuantity(productToMacroSource(product), g);
  }, [grams, product]);

  return (
    <div className="flex flex-col min-h-full max-w-lg mx-auto w-full px-4 pb-8 pt-2">
      <div className="card-premium p-5 space-y-1">
        <p className="text-xl font-bold text-white leading-tight">{product.name}</p>
        {product.brand && <p className="text-sm text-zinc-500">{product.brand}</p>}
      </div>

      <div className="mt-6">
        <label className="text-sm font-medium text-zinc-400">Menge (Gramm)</label>
        <Input
          type="number"
          inputMode="decimal"
          className="mt-2 h-14 text-2xl font-semibold text-center tabular-nums"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2 mt-3">
          {[50, 100, 150, 200].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setGrams(String(v))}
              className="flex-1 rounded-xl border border-zinc-700 py-2 text-sm font-medium text-zinc-300 hover:border-cyan-500/50 active:scale-95"
            >
              {v} g
            </button>
          ))}
        </div>
      </div>

      {macros && (
        <div className="mt-6 grid grid-cols-4 gap-2 text-center">
          {(
            [
              ["kcal", fmtKcal(macros.calories), "Kalorien"],
              ["P", fmtG(macros.proteinG), "Protein"],
              ["KH", fmtG(macros.carbsG), "KH"],
              ["F", fmtG(macros.fatG), "Fett"],
            ] as const
          ).map(([k, v, label]) => (
            <div key={k} className="card-premium p-3">
              <p className="text-lg font-bold text-white tabular-nums">{v}</p>
              <p className="text-[10px] text-zinc-500 uppercase">{label}</p>
            </div>
          ))}
        </div>
      )}

      <Button
        className="w-full h-14 text-lg mt-8 rounded-xl"
        disabled={adding || !macros}
        onClick={() => onAdd(parseFloat(grams))}
      >
        {adding ? "Wird hinzugefügt…" : "Hinzufügen"}
      </Button>
    </div>
  );
}
