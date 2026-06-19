"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { macrosForQuantity } from "@/lib/food-macros";
import { fmtG, fmtKcal } from "@/lib/format-macros";
import type { FoodProduct } from "@/lib/food/food-product-types";
import type { MealType } from "@prisma/client";
import {
  getPortionPresets,
  getDefaultPortionGrams,
} from "@/lib/food/portion-presets";

type Props = {
  product: FoodProduct;
  mealType: MealType;
  onClose: () => void;
  onAdd: (quantityG: number, meal: MealType) => void;
  adding?: boolean;
};

export const FoodDetailPopup = memo(function FoodDetailPopup({
  product,
  mealType,
  onClose,
  onAdd,
  adding,
}: Props) {
  const presets = useMemo(() => getPortionPresets(product), [product]);
  const [selectedGrams, setSelectedGrams] = useState(() =>
    getDefaultPortionGrams(product)
  );
  const [customMode, setCustomMode] = useState(false);
  const [customGrams, setCustomGrams] = useState("100");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const defaultG = getDefaultPortionGrams(product);
    setSelectedGrams(defaultG);
    setCustomMode(false);
    setCustomGrams(String(defaultG));
  }, [product]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const activeGrams = customMode
    ? Math.max(0, Number(customGrams.replace(",", ".")) || 0)
    : selectedGrams;

  const scaled = useMemo(() => {
    if (activeGrams <= 0) {
      return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    }
    return macrosForQuantity(
      {
        calories: product.calories,
        proteinG: product.proteinG,
        carbsG: product.carbsG,
        fatG: product.fatG,
        servingG: product.servingG || 100,
      },
      activeGrams
    );
  }, [product, activeGrams]);

  if (!mounted) return null;

  return createPortal(
    <div className="food-detail-popup-root" role="dialog" aria-modal="true">
      <button
        type="button"
        className="food-detail-popup-backdrop"
        aria-label="Zurück"
        onClick={onClose}
      />
      <div className="food-detail-popup-panel">
        <header className="food-detail-popup-header">
          <button
            type="button"
            onClick={onClose}
            className="food-add-popup-icon-btn"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white truncate">{product.name}</h2>
            {product.brand ? (
              <p className="text-xs text-zinc-500 truncate">{product.brand}</p>
            ) : null}
          </div>
        </header>

        <div className="food-detail-popup-body">
          <div className="grid grid-cols-4 gap-2">
            <MacroPill label="kcal" value={fmtKcal(scaled.calories)} highlight />
            <MacroPill label="Protein" value={`${fmtG(scaled.proteinG)}g`} />
            <MacroPill label="Carbs" value={`${fmtG(scaled.carbsG)}g`} />
            <MacroPill label="Fett" value={`${fmtG(scaled.fatG)}g`} />
          </div>

          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Portion
            </p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setCustomMode(false);
                    setSelectedGrams(p.grams);
                  }}
                  className={`shrink-0 rounded-xl px-3.5 py-2.5 text-sm font-medium border ${
                    !customMode && selectedGrams === p.grams
                      ? "bg-cyan-500/25 border-cyan-400/50 text-cyan-50"
                      : "bg-zinc-900/80 border-zinc-700 text-zinc-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                className={`shrink-0 rounded-xl px-3.5 py-2.5 text-sm font-medium border ${
                  customMode
                    ? "bg-cyan-500/25 border-cyan-400/50 text-cyan-50"
                    : "bg-zinc-900/80 border-zinc-700 text-zinc-300"
                }`}
              >
                Eigene Gramm
              </button>
            </div>
          </div>

          {customMode && (
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
                Gramm eingeben
              </label>
              <Input
                type="number"
                inputMode="decimal"
                min={1}
                max={5000}
                step={1}
                value={customGrams}
                onChange={(e) => setCustomGrams(e.target.value)}
                className="h-12 text-base rounded-xl bg-zinc-900 border-zinc-700"
                placeholder="z.B. 125"
                autoFocus
              />
            </div>
          )}

          <Button
            className="w-full h-14 text-base font-bold btn-accent rounded-2xl"
            disabled={adding || activeGrams <= 0}
            onClick={() => onAdd(activeGrams, mealType)}
          >
            <Plus className="h-5 w-5 mr-2 stroke-[2.5]" />
            Hinzufügen · {activeGrams} g
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
});

function MacroPill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-2 py-2.5 text-center border ${
        highlight
          ? "bg-cyan-500/12 border-cyan-500/30"
          : "bg-zinc-900/70 border-zinc-800"
      }`}
    >
      <p className="text-[9px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm font-bold text-white tabular-nums mt-0.5 leading-none">
        {value}
      </p>
    </div>
  );
}
