"use client";

import { memo } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { MEAL_TYPE_LABELS } from "@/lib/meal-types";
import { cn } from "@/lib/utils";
import type { MealType } from "@prisma/client";

const MEAL_EMOJI: Record<string, string> = {
  BREAKFAST: "🍳",
  LUNCH: "🍽",
  DINNER: "🌙",
  SNACK: "🍫",
};

type MealItemRow = {
  id: string;
  quantityG: number;
  food: { name: string };
  calories: number;
};

type MealSlotData = {
  mealType: MealType;
  mealId?: string | null;
  totals: { calories: number; proteinG: number; carbsG?: number; fatG?: number };
  items: MealItemRow[];
};

type Props = {
  meals: MealSlotData[];
  onRemove: (itemId: string) => void;
  onEdit?: (itemId: string, quantityG: number) => void;
  onDeleteMeal?: (mealId: string) => void;
  onAddClick?: (mealType: MealType) => void;
};

export const MealTrackList = memo(function MealTrackList({
  meals,
  onRemove,
  onEdit,
  onDeleteMeal,
  onAddClick,
}: Props) {
  const slots = Array.isArray(meals) ? meals : [];

  return (
    <div className="grid grid-cols-2 gap-2">
      {slots.map((slot) => {
        const emoji = MEAL_EMOJI[slot.mealType] ?? "🍽";
        const items = Array.isArray(slot.items) ? slot.items : [];
        const totals = slot.totals ?? { calories: 0, proteinG: 0 };
        const hasItems = items.length > 0;
        const kcal = Math.round(totals.calories ?? 0);
        const proteinG = Math.round(totals.proteinG ?? 0);

        return (
          <div
            key={slot.mealType}
            className={cn(
              "rounded-2xl border overflow-hidden flex flex-col",
              hasItems
                ? "border-accent/20 bg-gradient-to-b from-zinc-900/90 to-zinc-950"
                : "border-zinc-800/70 bg-zinc-900/50"
            )}
          >
            {/* Header */}
            <button
              type="button"
              onClick={() => onAddClick?.(slot.mealType)}
              className="flex items-center gap-2.5 px-3 pt-3 pb-2 w-full text-left"
              aria-label={`${MEAL_TYPE_LABELS[slot.mealType] ?? slot.mealType} öffnen`}
            >
              <span className="text-xl leading-none shrink-0" aria-hidden>
                {emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 leading-tight">
                  {MEAL_TYPE_LABELS[slot.mealType] ?? slot.mealType}
                </p>
                {hasItems ? (
                  <p className="text-[13px] font-bold text-white tabular-nums mt-0.5 leading-tight">
                    {kcal.toLocaleString("de-DE")} kcal
                    {proteinG > 0 && (
                      <span className="text-zinc-500 font-medium text-[11px]">
                        {" "}· {proteinG} g P
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-[12px] text-accent/70 mt-0.5 font-medium leading-tight flex items-center gap-0.5">
                    <Plus className="h-3 w-3" />
                    Lebensmittel
                  </p>
                )}
              </div>
            </button>

            {/* Items list */}
            {hasItems && (
              <ul className="border-t border-zinc-800/60 px-3 py-1.5 space-y-1 flex-1">
                {items.slice(0, 3).map((item) => (
                  <li key={item.id} className="flex items-center gap-1.5 min-h-[28px]">
                    <span className="text-zinc-300 truncate flex-1 min-w-0 text-[11px]">
                      {item.food?.name ?? "Lebensmittel"}
                    </span>
                    <span className="text-zinc-600 tabular-nums text-[10px] shrink-0">
                      {Math.round(item.calories)}
                    </span>
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(item.id, item.quantityG)}
                        className="text-zinc-700 hover:text-zinc-300 p-0.5 shrink-0"
                        aria-label="Menge bearbeiten"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="text-zinc-700 hover:text-red-400 p-0.5 shrink-0"
                      aria-label="Eintrag löschen"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
                {items.length > 3 && (
                  <p className="text-[10px] text-zinc-600 pb-0.5">
                    + {items.length - 3} weitere
                  </p>
                )}
              </ul>
            )}

            {/* Footer actions */}
            <div className={cn(
              "flex border-t px-2 py-1.5 gap-1",
              hasItems ? "border-zinc-800/60" : "border-transparent"
            )}>
              <button
                type="button"
                onClick={() => onAddClick?.(slot.mealType)}
                className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg bg-accent/10 border border-accent/20 text-accent text-[11px] font-semibold hover:bg-accent/20 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Hinzufügen
              </button>
              {slot.mealId && onDeleteMeal && hasItems && (
                <button
                  type="button"
                  onClick={() => onDeleteMeal(slot.mealId!)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  aria-label="Mahlzeit leeren"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
